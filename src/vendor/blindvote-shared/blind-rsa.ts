/**
 * RFC 9474 RSA Blind Signatures (RSABSSA-SHA384-PSS-Randomized).
 *
 * This is the cryptographic core of BlindVote's anonymity guarantee. The
 * Registration Authority signs a *blinded* payload and therefore never sees the
 * token it authorises; the client unblinds locally. Under the one-more-RSA-
 * inversion assumption the authority cannot link an issued signature to the
 * token later presented at the Ballot Box.
 *
 * Protocol (RFC 9474):
 *   Client(pk, msg)                          Server(sk)
 *   ------------------------------------------------------------------
 *   prepared = Prepare(msg)                  (client-side only)
 *   { blindedMsg, inv } = Blind(pk, prepared)
 *   blindedMsg            ----------------->
 *                                            blindSig = BlindSign(sk, blindedMsg)
 *   blindSig              <-----------------
 *   sig = Finalize(pk, prepared, blindSig, inv)
 *   verify(pk, sig, prepared) == true
 *
 * Implementation notes:
 * - Built on `@cloudflare/blindrsa-ts` (RFC 9474 compliant, validated against
 *   the RFC test vectors). It uses WebCrypto for key handling and sjcl bigint
 *   for the raw RSA operation, so it runs anywhere WebCrypto exists.
 * - Keys are RSA-PSS/SHA-384. Public keys are transported as base64url SPKI and
 *   private keys as base64url PKCS#8.
 */

import { RSABSSA } from '@cloudflare/blindrsa-ts'
import type { BlindRSA } from '@cloudflare/blindrsa-ts'
import { bytesToBase64Url, fromBase64Url } from './base64'

export type { BlindRSA }

export interface BlindOutput {
  blindedMsg: Uint8Array
  inv: Uint8Array
}

/** Human-readable identifier of the exact variant in use (for the report). */
export const BLIND_RSA_VARIANT = 'RSABSSA-SHA384-PSS-Randomized'

/** The RFC 9474 suite used by the Registration Authority. */
export const RA_KEY_ALGORITHM = { name: 'RSA-PSS', hash: 'SHA-384' } as const

export const RA_DEFAULT_MODULUS_LENGTH = 2048
export const TOKEN_BYTES = 32

let cachedSuite: BlindRSA | null = null

/**
 * Copy bytes into a fresh ArrayBuffer.
 *
 * `crypto.subtle.importKey` requires a `BufferSource` backed by `ArrayBuffer`;
 * newer TypeScript types `Uint8Array` as `Uint8Array<ArrayBufferLike>`, which is
 * not assignable. This returns a plain ArrayBuffer so it type-checks on Bun,
 * the browser and React Native alike.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

/** Returns the singleton RFC 9474 suite. */
export function blindRsaSuite(): BlindRSA {
  if (!cachedSuite) {
    cachedSuite = RSABSSA.SHA384.PSS.Randomized()
  }
  return cachedSuite
}

/** Generates a fresh Registration Authority key pair (RSA-PSS, SHA-384). */
export async function generateRAKeyPair(
  modulusLength: number = RA_DEFAULT_MODULUS_LENGTH
): Promise<CryptoKeyPair> {
  return RSABSSA.SHA384.generateKey({
    modulusLength,
    publicExponent: Uint8Array.from([1, 0, 1]), // 65537
  })
}

// ---------------------------------------------------------------------------
// Key serialization (for transport and persistence)
// ---------------------------------------------------------------------------

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  return bytesToBase64Url(new Uint8Array(spki))
}

export async function importPublicKey(base64Url: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    toArrayBuffer(fromBase64Url(base64Url)),
    RA_KEY_ALGORITHM,
    true,
    ['verify']
  )
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  return bytesToBase64Url(new Uint8Array(pkcs8))
}

export async function importPrivateKey(base64Url: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    toArrayBuffer(fromBase64Url(base64Url)),
    RA_KEY_ALGORITHM,
    true,
    ['sign']
  )
}

// ---------------------------------------------------------------------------
// Protocol steps
// ---------------------------------------------------------------------------

/** Generates a fresh random token message (the secret the voter keeps). */
export function generateToken(bytes: number = TOKEN_BYTES): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(bytes))
}

/**
 * Client step 1: prepare the token. For the Randomized variant this prefixes a
 * random nonce, so two identical tokens still produce distinct prepared values.
 */
export function prepareToken(token: Uint8Array): Uint8Array {
  return blindRsaSuite().prepare(token)
}

/** Client step 2: blind the prepared token. `inv` stays on the client. */
export async function blindPrepared(
  publicKey: CryptoKey,
  prepared: Uint8Array
): Promise<BlindOutput> {
  return blindRsaSuite().blind(publicKey, prepared)
}

/** Server step: sign the blinded payload without learning the token. */
export async function blindSign(
  privateKey: CryptoKey,
  blindedMsg: Uint8Array
): Promise<Uint8Array> {
  return blindRsaSuite().blindSign(privateKey, blindedMsg)
}

/** Client step 3: remove the blinding factor to obtain a valid signature. */
export async function finalizeSignature(
  publicKey: CryptoKey,
  prepared: Uint8Array,
  blindSig: Uint8Array,
  inv: Uint8Array
): Promise<Uint8Array> {
  return blindRsaSuite().finalize(publicKey, prepared, blindSig, inv)
}

/** Anyone with the RA public key can verify a token signature. */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: Uint8Array,
  prepared: Uint8Array
): Promise<boolean> {
  return blindRsaSuite().verify(publicKey, signature, prepared)
}

// ---------------------------------------------------------------------------
// Transport helpers (base64url strings over JSON)
// ---------------------------------------------------------------------------

export const encodeBytes = bytesToBase64Url
export const decodeBytes = fromBase64Url
