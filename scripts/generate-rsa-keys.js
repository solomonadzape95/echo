#!/usr/bin/env node

/**
 * Generate RSA Key Pair for Blind Signatures
 * 
 * This script generates a 2048-bit RSA key pair and outputs them
 * in the format needed for environment variables.
 * 
 * Usage:
 *   node scripts/generate-rsa-keys.js
 * 
 * Then copy the output to your .env file:
 *   RSA_PRIVATE_KEY="..."
 *   RSA_PUBLIC_KEY="..."
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048, // 2048-bit key
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
})

console.log('\n✅ RSA Key Pair Generated Successfully!\n')
console.log('='.repeat(80))
console.log('\n📋 Add these to your .env file:\n')
console.log('RSA_PRIVATE_KEY=' + JSON.stringify(privateKey))
console.log('RSA_PUBLIC_KEY=' + JSON.stringify(publicKey))
console.log('\n' + '='.repeat(80))

// Optionally save to .env file if it exists
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  // Check if keys already exist
  if (envContent.includes('RSA_PRIVATE_KEY') || envContent.includes('RSA_PUBLIC_KEY')) {
    console.log('\n⚠️  Warning: RSA keys already exist in .env file')
    console.log('   Please update them manually or remove the old ones first.\n')
  } else {
    // Append to .env file
    const newKeys = `\n# RSA Keys for Blind Signatures\nRSA_PRIVATE_KEY=${JSON.stringify(privateKey)}\nRSA_PUBLIC_KEY=${JSON.stringify(publicKey)}\n`
    fs.appendFileSync(envPath, newKeys)
    console.log('\n✅ Keys have been added to your .env file!\n')
  }
} else {
  console.log('\n💡 Tip: Create a .env file in your project root to store these keys.\n')
}

// Also save keys to separate files (optional, for backup)
const keysDir = path.join(process.cwd(), 'keys')
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true })
}

const privateKeyPath = path.join(keysDir, 'rsa-private-key.pem')
const publicKeyPath = path.join(keysDir, 'rsa-public-key.pem')

fs.writeFileSync(privateKeyPath, privateKey)
fs.writeFileSync(publicKeyPath, publicKey)

console.log('📁 Keys have also been saved to:')
console.log(`   Private: ${privateKeyPath}`)
console.log(`   Public:  ${publicKeyPath}`)
console.log('\n⚠️  Keep these files secure and never commit them to version control!\n')

