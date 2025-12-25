import crypto from 'crypto'

/**
 * Vote Encryption Service
 * 
 * This service handles server-side encryption of votes before storage.
 * Votes are encrypted using AES-256-GCM (symmetric encryption) with a key
 * derived from an environment variable or key management service.
 * 
 * Encryption ensures that even if the database is compromised, vote contents
 * remain protected. The encryption key should be stored securely and rotated regularly.
 */

export class VoteEncryptionService {
  private encryptionKey: Buffer
  private algorithm = 'aes-256-gcm'
  private ivLength = 16 // 128 bits for GCM
  private saltLength = 32 // 256 bits for key derivation

  constructor() {
    // Get encryption key from environment variable
    const keyString = process.env.VOTE_ENCRYPTION_KEY
    
    if (!keyString) {
      // Generate a key for development (WARNING: Not secure for production!)
      console.warn('⚠️  VOTE_ENCRYPTION_KEY not set. Generating a temporary key (NOT SECURE FOR PRODUCTION!)')
      this.encryptionKey = crypto.randomBytes(32) // 256 bits for AES-256
      console.warn('Generated key:', this.encryptionKey.toString('hex'))
      console.warn('Set VOTE_ENCRYPTION_KEY environment variable for production!')
    } else {
      // Derive a 256-bit key from the provided string using PBKDF2
      this.encryptionKey = crypto.pbkdf2Sync(
        keyString,
        'vote-encryption-salt', // In production, use a unique salt per election
        100000, // iterations
        32, // key length (256 bits)
        'sha256'
      )
    }
  }

  /**
   * Encrypt vote data (ballot/candidate selection)
   * 
   * @param voteData - The vote data to encrypt (JSON string or object)
   * @returns Encrypted data as hex string (format: iv:authTag:encryptedData)
   */
  encryptVoteData(voteData: string | object): string {
    try {
      // Convert to string if object
      const dataString = typeof voteData === 'string' 
        ? voteData 
        : JSON.stringify(voteData)

      // Generate random IV for this encryption
      const iv = crypto.randomBytes(this.ivLength)

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      )

      // Encrypt the data
      let encrypted = cipher.update(dataString, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag()

      // Return format: iv:authTag:encryptedData (all as hex)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error: any) {
      throw new Error(`Failed to encrypt vote data: ${error.message}`)
    }
  }

  /**
   * Decrypt vote data (for verification/auditing purposes)
   * 
   * @param encryptedData - The encrypted data as hex string (format: iv:authTag:encryptedData)
   * @returns Decrypted vote data as string
   */
  decryptVoteData(encryptedData: string): string {
    try {
      // Parse the encrypted data format: iv:authTag:encryptedData
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const [ivHex, authTagHex, encryptedHex] = parts

      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const encrypted = encryptedHex

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      )

      // Set authentication tag
      decipher.setAuthTag(authTag)

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error: any) {
      throw new Error(`Failed to decrypt vote data: ${error.message}`)
    }
  }

  /**
   * Get encryption metadata (for logging/auditing)
   */
  getEncryptionInfo(): { algorithm: string; keyLength: number } {
    return {
      algorithm: this.algorithm,
      keyLength: this.encryptionKey.length * 8, // Convert bytes to bits
    }
  }
}

export const voteEncryptionService = new VoteEncryptionService()

