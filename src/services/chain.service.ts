import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../db/db'
import { votes } from '../models/vote.schema'

/**
 * On-chain bridge.
 *
 * Mirrors each anonymous vote commitment to the BlindVoteLedger contract so the
 * election has a public, immutable audit trail. It is OFF by default; enable it
 * with CHAIN_ENABLED=true and the CHAIN_* variables.
 *
 * Only anonymous data crosses the boundary: the nullifier (sha256 of the token)
 * and the commitment (the vote's chain link). No identity, no ballot content.
 */

const LEDGER_ABI = [
  {
    type: 'function',
    name: 'createElection',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'electionId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitCommitment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'electionId', type: 'bytes32' },
      { name: 'nullifier', type: 'bytes32' },
      { name: 'commitment', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getElection',
    stateMutability: 'view',
    inputs: [{ name: 'electionId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'exists', type: 'bool' },
          { name: 'open', type: 'bool' },
          { name: 'head', type: 'bytes32' },
          { name: 'count', type: 'uint256' },
          { name: 'tallyDigest', type: 'bytes32' },
          { name: 'tallyPublished', type: 'bool' },
        ],
      },
    ],
  },
] as const

const localChain = {
  id: Number(process.env.CHAIN_ID || 31337),
  name: 'blindvote-local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.CHAIN_RPC_URL || 'http://localhost:8545'] } },
} as const

/** Maps an off-chain election UUID to its on-chain bytes32 id. */
export function electionIdToBytes32(electionId: string): Hex {
  return keccak256(toHex(electionId))
}

/** Maps a 64-char hex hash (no 0x) to bytes32. */
export function hashToBytes32(hash: string): Hex {
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash
  return `0x${clean.padStart(64, '0').slice(0, 64)}` as Hex
}

export interface ChainInfo {
  enabled: boolean
  rpcUrl: string
  ledgerAddress: string | null
  chainId: number
}

export interface OnChainElection {
  exists: boolean
  open: boolean
  head: string
  count: number
  tallyDigest: string
  tallyPublished: boolean
}

export class ChainService {
  private publicClient = createPublicClient({
    chain: localChain as any,
    transport: http(process.env.CHAIN_RPC_URL || 'http://localhost:8545'),
  })

  isEnabled(): boolean {
    return (
      process.env.CHAIN_ENABLED === 'true' &&
      !!process.env.CHAIN_LEDGER_ADDRESS &&
      !!process.env.CHAIN_PRIVATE_KEY
    )
  }

  /** Configuration snapshot for the in-app ledger page. */
  info(): ChainInfo {
    return {
      enabled: this.isEnabled(),
      rpcUrl: process.env.CHAIN_RPC_URL || 'http://localhost:8545',
      ledgerAddress: process.env.CHAIN_LEDGER_ADDRESS || null,
      chainId: Number(process.env.CHAIN_ID || 31337),
    }
  }

  /** Read the contract's view of an election (anonymous data only). */
  async getElectionState(electionId: string): Promise<OnChainElection> {
    if (!this.isEnabled()) {
      throw new Error('Chain bridge is disabled')
    }

    const election = (await this.publicClient.readContract({
      address: this.address(),
      abi: LEDGER_ABI,
      functionName: 'getElection',
      args: [electionIdToBytes32(electionId)],
    })) as {
      exists: boolean
      open: boolean
      head: Hex
      count: bigint
      tallyDigest: Hex
      tallyPublished: boolean
    }

    return {
      exists: election.exists,
      open: election.open,
      head: election.head,
      count: Number(election.count),
      tallyDigest: election.tallyDigest,
      tallyPublished: election.tallyPublished,
    }
  }

  /**
   * Backfill every off-chain commitment for an election to the contract.
   * Idempotent: duplicate commitments revert and are counted as skipped.
   */
  async syncElection(electionId: string) {
    if (!this.isEnabled()) {
      throw new Error('Chain bridge is disabled. Set CHAIN_ENABLED=true and the CHAIN_* variables.')
    }

    await this.ensureElection(electionId)

    const rows = await db
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(asc(votes.createdAt), asc(votes.id))

    let synced = 0
    let skipped = 0
    for (const vote of rows) {
      try {
        const tx = await this.submitCommitment(electionId, vote.tokenId, vote.currentHash)
        if (tx) synced++
        else skipped++
      } catch {
        skipped++
      }
    }

    return { total: rows.length, synced, skipped }
  }

  private walletClient() {
    const privateKey = process.env.CHAIN_PRIVATE_KEY as Hex
    const account = privateKeyToAccount(privateKey)
    return createWalletClient({
      account,
      chain: localChain as any,
      transport: http(process.env.CHAIN_RPC_URL || 'http://localhost:8545'),
    })
  }

  private address(): Address {
    return process.env.CHAIN_LEDGER_ADDRESS as Address
  }

  /** Ensure the election exists on-chain (idempotent). */
  async ensureElection(electionId: string) {
    if (!this.isEnabled()) return false
    const id = electionIdToBytes32(electionId)

    const election = (await this.publicClient.readContract({
      address: this.address(),
      abi: LEDGER_ABI,
      functionName: 'getElection',
      args: [id],
    })) as { exists: boolean }

    if (election.exists) return true

    const wallet = this.walletClient()
    const hash = await wallet.writeContract({
      address: this.address(),
      abi: LEDGER_ABI,
      functionName: 'createElection',
      args: [id],
    })
    await this.publicClient.waitForTransactionReceipt({ hash })
    return true
  }

  /** Mirror one anonymous commitment. Returns the tx hash, or null if skipped. */
  async submitCommitment(electionId: string, nullifier: string, commitment: string) {
    if (!this.isEnabled()) return null

    const wallet = this.walletClient()
    const hash = await wallet.writeContract({
      address: this.address(),
      abi: LEDGER_ABI,
      functionName: 'submitCommitment',
      args: [
        electionIdToBytes32(electionId),
        hashToBytes32(nullifier),
        hashToBytes32(commitment),
      ],
    })
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /**
   * Background backfill: sync only elections whose on-chain commitment count is
   * behind the off-chain vote count. Safe to call repeatedly.
   */
  async syncPendingElections() {
    if (!this.isEnabled()) return { checked: 0, synced: 0 }

    const rows = await db
      .select({
        election: votes.election,
        count: sql<number>`count(*)::int`,
      })
      .from(votes)
      .groupBy(votes.election)

    let synced = 0

    for (const row of rows) {
      try {
        const onChain = await this.getElectionState(row.election)
        if (onChain.count < Number(row.count)) {
          await this.syncElection(row.election)
          synced++
        }
      } catch (error: any) {
        console.error(
          `[CHAIN SYNC] ${row.election}: ${error?.message || error}`
        )
      }
    }

    return { checked: rows.length, synced }
  }
}

export const chainService = new ChainService()
