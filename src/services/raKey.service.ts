import { desc, eq } from 'drizzle-orm'
import {
  BLIND_RSA_VARIANT,
  exportPrivateKey,
  exportPublicKey,
  generateRAKeyPair,
  importPrivateKey,
  importPublicKey,
} from '../vendor/blindvote-shared'
import { db } from '../db/db'
import { raKeys } from '../models/raKey.schema'

export interface ActiveRAKey {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyB64: string
  variant: string
}

/**
 * Loads (or lazily creates) the active Registration Authority key pair.
 *
 * The CryptoKey objects are cached in memory; the base64url encodings are what
 * the API publishes and what is persisted.
 */
export class RAKeyService {
  private cached: ActiveRAKey | null = null

  async getActiveKey(): Promise<ActiveRAKey> {
    if (this.cached) return this.cached

    const [row] = await db
      .select()
      .from(raKeys)
      .where(eq(raKeys.active, true))
      .orderBy(desc(raKeys.createdAt))
      .limit(1)

    if (row) {
      this.cached = {
        publicKey: await importPublicKey(row.publicKey),
        privateKey: await importPrivateKey(row.privateKey),
        publicKeyB64: row.publicKey,
        variant: row.variant,
      }
      return this.cached
    }

    return this.generateAndStore()
  }

  /** Generates a new RA key pair, persists it and makes it the active key. */
  async generateAndStore(): Promise<ActiveRAKey> {
    const { publicKey, privateKey } = await generateRAKeyPair()
    const publicKeyB64 = await exportPublicKey(publicKey)
    const privateKeyB64 = await exportPrivateKey(privateKey)

    // Retire any previously active key (kept for verifying old signatures).
    await db
      .update(raKeys)
      .set({ active: false, retiredAt: new Date() })
      .where(eq(raKeys.active, true))

    await db.insert(raKeys).values({
      publicKey: publicKeyB64,
      privateKey: privateKeyB64,
      variant: BLIND_RSA_VARIANT,
      active: true,
    })

    this.cached = { publicKey, privateKey, publicKeyB64, variant: BLIND_RSA_VARIANT }
    return this.cached
  }

  clearCache(): void {
    this.cached = null
  }
}

export const raKeyService = new RAKeyService()
