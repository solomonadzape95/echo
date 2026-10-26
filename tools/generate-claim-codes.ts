/**
 * Generate one-time registration claim codes for unregistered masterlist
 * entries. Only the HMAC-SHA256 hash is stored in the database; the plain code
 * is written once to tools/output/claim-codes.csv for the electoral committee
 * to distribute.
 *
 *   bun run scripts/generate-claim-codes.ts
 *   bun run scripts/generate-claim-codes.ts --force   # regenerate all
 *
 * Treat the CSV as sensitive: anyone with a reg number + code can claim that
 * student's account.
 */
import { randomInt } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '../src/db/db'
import { masterlist } from '../src/models/masterlist.schema'
import { voters } from '../src/models/voter.schema'
import { hashRegistrationCode } from '../src/services/auth.service'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const FORCE = process.argv.includes('--force')

function generateCode(): string {
  let raw = ''
  for (let i = 0; i < 10; i++) {
    raw += ALPHABET[randomInt(0, ALPHABET.length)]
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

async function main() {
  const conditions = [isNull(voters.id)]
  if (!FORCE) {
    conditions.push(isNull(masterlist.registrationCodeHash))
  }

  const rows = await db
    .select({
      id: masterlist.id,
      regNo: masterlist.regNo,
      name: masterlist.name,
    })
    .from(masterlist)
    .leftJoin(voters, eq(voters.regNumber, masterlist.regNo))
    .where(and(...conditions))

  if (rows.length === 0) {
    console.log('No unclaimed masterlist entries need a code.')
    return
  }

  const output: Array<{ regNo: string; name: string; code: string }> = []

  for (const row of rows) {
    const code = generateCode()
    await db
      .update(masterlist)
      .set({ registrationCodeHash: hashRegistrationCode(code) })
      .where(eq(masterlist.id, row.id))
    output.push({ regNo: row.regNo, name: row.name, code })
  }

  const dir = join(process.cwd(), 'tools', 'output')
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'claim-codes.csv')
  const csv = [
    'reg_no,name,claim_code',
    ...output.map((entry) => `${entry.regNo},"${entry.name.replace(/"/g, '""')}",${entry.code}`),
  ].join('\n')
  await writeFile(file, csv + '\n', 'utf8')

  console.log(`Generated ${output.length} claim code(s).`)
  console.log(`CSV: ${file}`)
  console.log('Distribute individually and securely. Do not post this file publicly.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
