import { describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { db } from '../src/db/db'
import { elections } from '../src/models/election.schema'
import { voteService } from '../src/services/vote.service'

/**
 * Anonymity invariants.
 *
 * These assertions encode the structural guarantee the whole project rests on:
 * the database must not contain a path from a voter identity to a ballot.
 *
 * They are the automated form of the claim "no voter-to-vote link".
 */

async function columns(table: string): Promise<string[]> {
  const res = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table}`
  )
  return (res.rows as Array<{ column_name: string }>).map((r) => r.column_name)
}

describe('anonymity invariants (database)', () => {
  test('issuances records identity but carries no token link', async () => {
    const cols = await columns('issuances')
    expect(cols).toContain('voter')
    expect(cols).toContain('election')
    expect(cols).toContain('voted_at')
    expect(cols).not.toContain('token_hash')
    expect(cols).not.toContain('token_id')
  })

  test('tokens has no voter link', async () => {
    const cols = await columns('tokens')
    expect(cols).toContain('token_hash')
    expect(cols).not.toContain('voter')
    expect(cols).not.toContain('voter_id')
  })

  test('votes has no voter link', async () => {
    const cols = await columns('votes')
    expect(cols).not.toContain('voter')
    expect(cols).not.toContain('voter_id')
  })

  test('no vote stores a plaintext ballot and every vote is signed', async () => {
    const res = await db.execute(sql`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE signature IS NOT NULL) AS signed,
        count(*) FILTER (WHERE encrypted_vote_data IS NOT NULL AND encrypted_vote_data LIKE '{%') AS plaintext
      FROM votes
    `)
    const row = res.rows[0] as { total: number; signed: number; plaintext: number }
    expect(Number(row.signed)).toBe(Number(row.total))
    expect(Number(row.plaintext)).toBe(0)
  })

  test('every election ledger verifies (signed + anchored)', async () => {
    const all = await db.select().from(elections)
    expect(all.length).toBeGreaterThan(0)
    for (const election of all) {
      const result = await voteService.verifyChain(election.id)
      expect(result.valid).toBe(true)
    }
  })

  test('token, nullifier and issuance uniqueness indexes exist', async () => {
    const res = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'tokens_token_hash_unique',
          'votes_token_id_unique',
          'issuances_election_voter_unique'
        )
    `)
    const names = (res.rows as Array<{ indexname: string }>).map((r) => r.indexname)
    expect(names).toContain('tokens_token_hash_unique')
    expect(names).toContain('votes_token_id_unique')
    expect(names).toContain('issuances_election_voter_unique')
  })

  test('the legacy voter-to-vote join is impossible', async () => {
    // This is the exact query that used to de-anonymise the database.
    let failed = false
    try {
      await db.execute(sql`SELECT i.voter, i.token_hash FROM issuances i LIMIT 1`)
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })
})
