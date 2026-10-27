import { eq, and, desc, sql } from 'drizzle-orm'
import { db, generateReceiptCode } from '../db/db'
import { votes } from '../models/vote.schema'
import { elections } from '../models/election.schema'
import { tokens } from '../models/token.schema'
import { receipts } from '../models/receipt.schema'
import { issuances } from '../models/issuance.schema'
import { ledgerAnchors } from '../models/ledgerAnchor.schema'
import type { CreateVoteInput } from '../validators/vote.validator'
import { GENESIS_HASH } from '../validators/vote.validator'
import { voteEncryptionService } from './voteEncryption.service'
import { blindSignatureService } from './blindSignature.service'
import { raKeyService } from './raKey.service'
import { checkEligibilityByDomain } from '../helpers/eligibility.helpers'
import { getElectionPhase, electionPhaseMessage } from '../helpers/electionState.helpers'
import { decodeBytes, verifySignature } from '../vendor/blindvote-shared'
import crypto from 'crypto'

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex')

// Constant hash used for abstentions (empty ballot). It contains no voter data.
const ABSTENTION_HASH = sha256('abstention')

export class VoteService {
  /**
   * Create a new vote atomically (handles genesis vote automatically).
   *
   * Security properties:
   * - Eligibility and token validity are checked inside a transaction.
   * - The ballot is encrypted server-side (AES-256-GCM) and only the ciphertext
   *   is persisted. The stored `voteDataHash` is a hash of the CIPHERTEXT, so it
   *   leaks nothing about the ballot (the old design hashed the plaintext, which
   *   is brute-forceable for a small candidate space).
   * - `prevHash` and `currentHash` are computed SERVER-SIDE. The client's values
   *   are ignored, so a malicious client cannot forge a chain link.
   * - Each link is signed with the server RSA key, so recomputing the chain is
   *   not enough to tamper with it.
   */
  async create(input: CreateVoteInput, voterId: string) {
    return await db.transaction(async (tx) => {
      // 1. Verify election exists
      const [election] = await tx
        .select()
        .from(elections)
        .where(eq(elections.id, input.election))
        .limit(1)

      if (!election) {
        throw new Error('Election not found')
      }

      // 2. Voting must be open. This is enforced here, not only in the UI:
      //    a valid token must not be usable after the end date.
      const phase = getElectionPhase(election)
      if (phase !== 'active') {
        throw new Error(electionPhaseMessage(phase))
      }

      // 3. Verify eligibility by domain matching (class/department/faculty)
      const eligibility = await checkEligibilityByDomain(voterId, input.election)

      if (!eligibility.eligible) {
        throw new Error(
          `Voter is not eligible to vote in this election: ${eligibility.reason || 'Domain mismatch'}`
        )
      }

      // 3. Ensure an issuance marker exists and the voter has not already voted.
      //    The marker stores voter+election only - it is NOT linked to the token
      //    or the vote, so it cannot be used to de-anonymise a ballot.
      // Lock the issuance row before checking votedAt. Without this lock two
      // concurrent requests from the same voter can both read votedAt = NULL
      // and append two ballots (different tokens would still both pass the
      // token-hash check). The lock serialises the check-and-consume step per
      // voter while keeping the vote row itself anonymous.
      const [issuance] = await tx
        .select()
        .from(issuances)
        .where(and(eq(issuances.voterId, voterId), eq(issuances.election, input.election)))
        .for('update')
        .limit(1)

      if (!issuance) {
        throw new Error('No voting token has been issued to you for this election')
      }
      if (issuance.votedAt) {
        throw new Error('You have already voted in this election')
      }

      // 4. Verify the RA blind signature. The Ballot Box checks s^e = m against
      //    the RA public key without needing to know who requested the signature.
      const { publicKey } = await raKeyService.getActiveKey()
      const preparedBytes = decodeBytes(input.prepared)
      const signatureValid = await verifySignature(
        publicKey,
        decodeBytes(input.signature),
        preparedBytes
      )
      if (!signatureValid) {
        throw new Error('Invalid token signature')
      }

      // 5. Consume the token. `sha256(prepared)` is an anonymous nullifier: it
      //    proves single use without linking to a voter identity.
      const tokenHash = sha256(Buffer.from(preparedBytes))
      const [existingToken] = await tx
        .select()
        .from(tokens)
        .where(eq(tokens.tokenHash, tokenHash))
        .limit(1)

      if (existingToken) {
        if (existingToken.usedAt) {
          throw new Error('Token has already been used')
        }
        if (existingToken.election !== input.election) {
          throw new Error('Token does not belong to this election')
        }
        await tx
          .update(tokens)
          .set({ usedAt: new Date() })
          .where(eq(tokens.id, existingToken.id))
      } else {
        try {
          await tx.insert(tokens).values({
            election: input.election,
            tokenHash,
            usedAt: new Date(),
          })
        } catch (error: any) {
          // Concurrent replay of the same token: the unique index is the
          // final arbiter, not the earlier SELECT.
          const code = error?.code || error?.cause?.code
          if (code === '23505') {
            throw new Error('Token has already been used')
          }
          throw error
        }
      }

      // 6. Determine prevHash SERVER-SIDE. Lock the last row so concurrent
      //    votes cannot build divergent chains.
      const lastVote = await this.getLastVoteForElectionInTxWithLock(tx, input.election)
      const prevHash = lastVote ? lastVote.currentHash : GENESIS_HASH

      // 5. Encrypt the ballot server-side. Only ciphertext is stored.
      let encryptedVoteData: string | null = null
      if (input.voteData && Object.keys(input.voteData).length > 0) {
        encryptedVoteData = voteEncryptionService.encryptVoteData(input.voteData)
      }

      // 6. Hash the ciphertext (never the plaintext).
      const voteDataHash = encryptedVoteData ? sha256(encryptedVoteData) : ABSTENTION_HASH

      // 7. Compute the chain link server-side.
      const currentHash = sha256(prevHash + voteDataHash)

      // 8. Sign the link for tamper-evidence.
      const signature = blindSignatureService.signHash(currentHash)

      // 9. Insert the vote
      const [newVote] = await tx
        .insert(votes)
        .values({
          prevHash,
          currentHash,
          voteDataHash,
          encryptedVoteData,
          signature,
          tokenId: tokenHash,
          election: input.election,
        })
        .returning()

      if (!newVote) {
        throw new Error('Failed to create vote')
      }

      // 11. Mark the issuance as voted. This prevents double voting without
      //     recording which token or vote belonged to this voter.
      await tx
        .update(issuances)
        .set({ votedAt: new Date() })
        .where(eq(issuances.id, issuance.id))

      // 11. Generate a unique receipt code and create the receipt
      let receiptCode: string
      let attempts = 0
      const maxAttempts = 10

      do {
        receiptCode = generateReceiptCode()
        const [existing] = await tx
          .select()
          .from(receipts)
          .where(eq(receipts.receiptCode, receiptCode))
          .limit(1)

        if (!existing) break
        attempts++
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique receipt code')
        }
      } while (true)

      const [newReceipt] = await tx
        .insert(receipts)
        .values({
          receiptCode,
          election: input.election,
          voteId: newVote.id,
        })
        .returning()

      if (!newReceipt) {
        throw new Error('Failed to create receipt')
      }

      // 12. Anchor the signed chain head for this election
      await this.upsertAnchor(tx, input.election)

      return {
        vote: newVote,
        receipt: newReceipt,
      }
    })
  }

  /**
   * Upsert the signed head of an election's vote chain.
   */
  private async upsertAnchor(tx: any, electionId: string) {
    const lastVote = await this.getLastVoteForElectionInTx(tx, electionId)
    if (!lastVote) return

    const countResult = await tx.execute(
      sql`SELECT count(*)::int AS c FROM votes WHERE election = ${electionId}`
    )
    const voteCount = countResult.rows?.[0]?.c ?? 0
    const headSignature = blindSignatureService.signHash(lastVote.currentHash)

    await tx.execute(sql`
      INSERT INTO ledger_anchors (election, head_hash, head_signature, vote_count, anchored_at)
      VALUES (${electionId}, ${lastVote.currentHash}, ${headSignature}, ${voteCount}, now())
      ON CONFLICT (election) DO UPDATE SET
        head_hash = EXCLUDED.head_hash,
        head_signature = EXCLUDED.head_signature,
        vote_count = EXCLUDED.vote_count,
        anchored_at = EXCLUDED.anchored_at
    `)
  }

  /**
   * Get the last vote for an election (for chain linking) - transaction version.
   * Deterministic ordering by created_at then id.
   */
  private async getLastVoteForElectionInTx(tx: any, electionId: string) {
    const [lastVote] = await tx
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(desc(votes.createdAt), desc(votes.id))
      .limit(1)

    return lastVote || null
  }

  /**
   * Get the last vote for an election with FOR UPDATE lock to prevent race
   * conditions when multiple votes are created simultaneously.
   */
  private async getLastVoteForElectionInTxWithLock(tx: any, electionId: string) {
    const result = await tx.execute(sql`
      SELECT id, prev_hash, current_hash, vote_data_hash, encrypted_vote_data, signature, token_id, election, created_at, updated_at
      FROM votes
      WHERE election = ${electionId}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      FOR UPDATE
    `)

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      return {
        id: row.id,
        prevHash: row.prev_hash,
        currentHash: row.current_hash,
        voteDataHash: row.vote_data_hash,
        encryptedVoteData: row.encrypted_vote_data,
        signature: row.signature,
        tokenId: row.token_id,
        election: row.election,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }

    return null
  }

  /**
   * Get all votes
   */
  async getAll() {
    return await db.select().from(votes)
  }

  /**
   * Get vote by ID
   */
  async getById(id: string) {
    const [vote] = await db.select().from(votes).where(eq(votes.id, id)).limit(1)

    if (!vote) {
      throw new Error('Vote not found')
    }

    return vote
  }

  /**
   * Get votes by election (newest first)
   */
  async getByElection(electionId: string) {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.election, electionId))
      .orderBy(desc(votes.createdAt), desc(votes.id))
  }

  /**
   * Get votes by token
   */
  async getByToken(tokenId: string) {
    return await db.select().from(votes).where(eq(votes.tokenId, tokenId))
  }

  /**
   * Whether a voter is eligible for an election and whether they have voted.
   * Used by the clients to show the correct call-to-action.
   */
  async getVoterStatus(voterId: string, electionId: string) {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    const eligibility = await checkEligibilityByDomain(voterId, electionId)
    const phase = getElectionPhase(election)

    const [issuance] = await db
      .select()
      .from(issuances)
      .where(and(eq(issuances.voterId, voterId), eq(issuances.election, electionId)))
      .limit(1)

    return {
      eligible: eligibility.eligible,
      hasVoted: !!issuance?.votedAt,
      isOpen: phase === 'active',
      phase,
    }
  }

  /**
   * Verify vote chain integrity for an election.
   *
   * Checks, for every link:
   * - the stored ciphertext hash matches `voteDataHash` (payload integrity);
   * - `currentHash == sha256(prevHash + voteDataHash)` (chain integrity);
   * - `prevHash` matches the previous vote's `currentHash` (linkage);
   * - the link carries a valid RSA signature (tamper-evidence);
   * - the signed anchor head matches the actual chain head.
   */
  async verifyChain(electionId: string) {
    const electionVotes = await this.getByElection(electionId)

    if (electionVotes.length === 0) {
      return { valid: true, message: 'No votes to verify', voteCount: 0 }
    }

    // Deterministic chronological order (oldest first)
    const votesInOrder = [...electionVotes].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      if (ta !== tb) return ta - tb
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })

    const firstVote = votesInOrder[0]!
    if (firstVote.prevHash !== GENESIS_HASH) {
      return {
        valid: false,
        message: 'First vote does not have genesis hash',
        voteId: firstVote.id,
        expectedPrevHash: GENESIS_HASH,
        actualPrevHash: firstVote.prevHash,
      }
    }

    for (let i = 0; i < votesInOrder.length; i++) {
      const vote = votesInOrder[i]!

      // Payload integrity: the stored hash must match the stored ciphertext
      const expectedDataHash = vote.encryptedVoteData
        ? sha256(vote.encryptedVoteData)
        : ABSTENTION_HASH

      if (vote.voteDataHash !== expectedDataHash) {
        return {
          valid: false,
          message: 'Vote data hash mismatch (payload altered)',
          voteId: vote.id,
        }
      }

      // Chain integrity: recompute the link server-side
      const expectedCurrentHash = sha256(vote.prevHash + vote.voteDataHash)
      if (vote.currentHash !== expectedCurrentHash) {
        return {
          valid: false,
          message: 'Vote hash mismatch (chain link altered)',
          voteId: vote.id,
          expectedCurrentHash,
          actualCurrentHash: vote.currentHash,
        }
      }

      // Linkage to the previous vote
      if (i > 0) {
        const previousVote = votesInOrder[i - 1]!
        if (vote.prevHash !== previousVote.currentHash) {
          return {
            valid: false,
            message: 'Vote chain broken',
            voteId: vote.id,
            expectedPrevHash: previousVote.currentHash,
            actualPrevHash: vote.prevHash,
          }
        }
      }

      // Tamper-evidence: signature over the link
      if (!vote.signature || !blindSignatureService.verifyHash(vote.currentHash, vote.signature)) {
        return {
          valid: false,
          message: 'Invalid or missing vote signature',
          voteId: vote.id,
        }
      }
    }

    // Anchor check
    const headVote = votesInOrder[votesInOrder.length - 1]!
    const [anchor] = await db
      .select()
      .from(ledgerAnchors)
      .where(eq(ledgerAnchors.election, electionId))
      .limit(1)

    let anchored = false
    if (anchor) {
      anchored =
        anchor.headHash === headVote.currentHash &&
        blindSignatureService.verifyHash(anchor.headHash, anchor.headSignature)

      if (!anchored) {
        return {
          valid: false,
          message: 'Ledger anchor does not match the chain head',
          voteId: headVote.id,
        }
      }
    }

    return {
      valid: true,
      message: 'Vote chain is valid, signed and anchored',
      voteCount: electionVotes.length,
      headHash: headVote.currentHash,
      anchored,
    }
  }
}

export const voteService = new VoteService()
