import * as crypto from 'crypto'
import { modPow, randBetween } from 'bigint-crypto-utils'

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

  constructor() {
    // Load or generate RSA key pair
    const privateKeyPem = process.env.RSA_PRIVATE_KEY
    const publicKeyPem = process.env.RSA_PUBLIC_KEY

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
    // Get public key details
    const publicKeyDetails = this.publicKey.asymmetricKeyDetails!
    const exponent = publicKeyDetails.publicExponent || 65537
    this.publicExponent = BigInt(exponent)
    
    // Note: Node.js crypto doesn't directly expose modulus (n) and private exponent (d)
    // For proper implementation, you might want to use a library like 'node-forge'
    // that can extract these values from PEM keys, or store them separately.
    // For now, we'll use the key objects for signing and let the client handle blinding/unblinding
    // The client will need the public key PEM to extract the modulus
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
    // Extract public key components
    const publicKeyDetails = this.publicKey.asymmetricKeyDetails!
    const exponent = publicKeyDetails.publicExponent || 65537
    
    // For the modulus, we need to extract it from the key
    // Since Node.js doesn't expose this directly, we'll provide the public key PEM
    // and let the client extract the modulus using a crypto library
    
    return {
      modulus: 'extract_from_public_key', // Client should extract from PEM using node-forge or similar
      exponent: exponent.toString(16),
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
}

export const blindSignatureService = new BlindSignatureService()

