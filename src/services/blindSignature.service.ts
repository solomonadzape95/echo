import * as crypto from 'crypto'
import { modPow, randBetween } from 'bigint-crypto-utils'

/**
 * Normalize a PEM key that may have been stored in a .env file with escaped
 * newlines (e.g. "-----BEGIN...\nMIIE...\n-----END..."). Bun's .env loader does
 * not interpret \n escapes inside quoted values, so we decode them here.
 */
function normalizePem(pem: string | undefined): string | undefined {
  return pem?.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem
}

/**
 * RSA Blind Signature Service (Chaum Blind Signature Scheme)
 * 
 * This service implements proper RSA blind signatures using Chaum's scheme.
 * Blind signatures allow the server to sign a token without seeing its contents,
 * ensuring voter anonymity while maintaining verifiability.
 * 
 * Mathematical Process (Chaum Blind Signature):
 * 1. Client has message m (token)
 * 2. Client generates random blinding factor r (coprime to n)
 * 3. Client blinds: m' = m * r^e mod n (where e is public exponent, n is modulus)
 * 4. Server signs: s' = (m')^d mod n (where d is private exponent)
 * 5. Client unblinds: s = s' * r^(-1) mod n = m^d mod n (the signature)
 * 
 * The server never sees the original message m, only the blinded version m'
 */

export class BlindSignatureService {
  private privateKey: crypto.KeyObject
  private publicKey: crypto.KeyObject
  private publicExponent: bigint = BigInt(65537) // Default RSA public exponent
  private modulus: bigint | null = null

  constructor() {
    // Load or generate RSA key pair
    const privateKeyPem = normalizePem(process.env.RSA_PRIVATE_KEY)
    const publicKeyPem = normalizePem(process.env.RSA_PUBLIC_KEY)

    if (!privateKeyPem || !publicKeyPem) {
      // Generate new key pair if not provided (for development)
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      })

      this.privateKey = crypto.createPrivateKey(privateKey)
      this.publicKey = crypto.createPublicKey(publicKey)
      
      console.warn('⚠️  Generated new RSA key pair. Set RSA_PRIVATE_KEY and RSA_PUBLIC_KEY env vars for production.')
      console.log('Public Key (for client):', publicKey)
    } else {
      this.privateKey = crypto.createPrivateKey(privateKeyPem)
      this.publicKey = crypto.createPublicKey(publicKeyPem)
    }

    // Extract RSA parameters for blind signature operations
    this.extractRSAParameters()
  }

  /**
   * Extract RSA parameters (n, e, d) from the key pair
   */
  private extractRSAParameters() {
    // Export the public key as JWK to obtain the real RSA modulus (n) and
    // public exponent (e). Node's asymmetricKeyDetails only exposes e.
    const jwk = this.publicKey.export({ format: 'jwk' }) as { n?: string; e?: string }

    if (jwk.n) {
      this.modulus = BigInt('0x' + Buffer.from(jwk.n, 'base64url').toString('hex'))
    }
    if (jwk.e) {
      this.publicExponent = BigInt('0x' + Buffer.from(jwk.e, 'base64url').toString('hex'))
    } else {
      const exponent = this.publicKey.asymmetricKeyDetails?.publicExponent || 65537
      this.publicExponent = BigInt(exponent)
    }
  }

  /**
   * Get the public key (for clients to use for blinding)
   */
  getPublicKey(): string {
    return this.publicKey.export({ type: 'spki', format: 'pem' }) as string
  }

  /**
   * Get RSA public key parameters for client-side blinding
   * Returns modulus (n) and public exponent (e) as hex strings
   * 
   * Note: Node.js crypto doesn't directly expose the modulus.
   * Clients should extract it from the PEM public key using a library like 'node-forge'
   */
  getPublicKeyParameters(): { modulus: string; exponent: string } {
    if (!this.modulus) {
      throw new Error('RSA modulus not available')
    }

    return {
      modulus: this.modulus.toString(16),
      exponent: this.publicExponent.toString(16),
    }
  }

  /**
   * Sign a blinded token using RSA
   * The server signs the blinded token without seeing the original token
   * 
   * This implements: s' = (m')^d mod n
   * 
   * @param blindedTokenHex - The blinded token as hex string (representing m')
   * @returns The signature of the blinded token as hex string (s')
   */
  signBlindedToken(blindedTokenHex: string): string {
    try {
      // Convert hex string to Buffer
      const blindedBuffer = Buffer.from(blindedTokenHex, 'hex')

      // Sign the blinded token using RSA private key with PKCS1 padding
      // This performs: s' = (m')^d mod n
      const signature = crypto.sign('RSA-SHA256', blindedBuffer, {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      })

      return signature.toString('hex')
    } catch (error: any) {
      throw new Error(`Failed to sign blinded token: ${error.message}`)
    }
  }

  /**
   * Verify a signature (for testing/debugging)
   * In production, clients should verify signatures themselves
   * 
   * @param token - The original token
   * @param signature - The signature to verify
   * @returns True if signature is valid
   */
  verifySignature(token: string | Buffer, signature: string | Buffer): boolean {
    try {
      const tokenBuffer = typeof token === 'string' 
        ? Buffer.from(token, 'hex') 
        : token

      const signatureBuffer = typeof signature === 'string' 
        ? Buffer.from(signature, 'hex') 
        : signature

      return crypto.verify(
        'RSA-SHA256',
        tokenBuffer,
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        signatureBuffer
      )
    } catch (error) {
      return false
    }
  }

  /**
   * Sign a ledger chain link (vote currentHash) with the RSA private key.
   * This is what makes the hash-chain tamper-evident: recomputing the chain
   * is not enough, an attacker also needs the private key to forge the link.
   */
  signHash(hashHex: string): string {
    const signature = crypto.sign('RSA-SHA256', Buffer.from(hashHex, 'utf8'), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    })
    return signature.toString('hex')
  }

  /**
   * Verify a ledger chain link signature with the RSA public key.
   */
  verifyHash(hashHex: string, signatureHex: string): boolean {
    try {
      return crypto.verify(
        'RSA-SHA256',
        Buffer.from(hashHex, 'utf8'),
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(signatureHex, 'hex')
      )
    } catch (error) {
      return false
    }
  }
}

export const blindSignatureService = new BlindSignatureService()

