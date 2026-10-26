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
}

export const chainService = new ChainService()
