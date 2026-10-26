/**
 * Dependency-free base64url codec.
 *
 * Kept in the shared package (rather than Buffer/btoa) so the same code runs on
 * Bun, browsers, and React Native/Hermes without polyfills.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += CHARS[b0 >> 2]
    out += CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
    if (b1 === undefined) break
    out += CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
    if (b2 === undefined) break
    out += CHARS[b2 & 63]
  }
  return out
}

export function fromBase64Url(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9\-_]/g, '')
  const bytes = new Uint8Array(Math.floor((clean.length * 6) / 8))
  let buffer = 0
  let bits = 0
  let p = 0
  for (let i = 0; i < clean.length; i++) {
    const v = CHARS.indexOf(clean[i]!)
    if (v === -1) continue
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes[p++] = (buffer >> bits) & 0xff
    }
  }
  return bytes
}
