# Scripts

## Generate RSA Keys

Generate RSA key pairs for blind signatures:

```bash
# Using npm script
npm run generate:rsa-keys

# Or directly with node
node scripts/generate-rsa-keys.js
```

This will:
1. Generate a 2048-bit RSA key pair
2. Display the keys in the format needed for `.env` file
3. Optionally add them to your `.env` file (if it exists)
4. Save backup copies to `keys/` directory

### Alternative Methods

#### Method 1: Using OpenSSL (Command Line)

```bash
# Generate private key
openssl genrsa -out rsa-private-key.pem 2048

# Extract public key
openssl rsa -in rsa-private-key.pem -pubout -out rsa-public-key.pem

# Then add to .env (remove newlines or use single quotes)
RSA_PRIVATE_KEY="$(cat rsa-private-key.pem)"
RSA_PUBLIC_KEY="$(cat rsa-public-key.pem)"
```

#### Method 2: Using Node.js One-Liner

```bash
node -e "const crypto = require('crypto'); const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {modulusLength: 2048, publicKeyEncoding: {type: 'spki', format: 'pem'}, privateKeyEncoding: {type: 'pkcs8', format: 'pem'}}); console.log('RSA_PRIVATE_KEY=' + JSON.stringify(privateKey)); console.log('RSA_PUBLIC_KEY=' + JSON.stringify(publicKey));"
```

#### Method 3: Using Bun

```bash
bun run scripts/generate-rsa-keys.js
```

### Security Notes

⚠️ **Important:**
- Never commit private keys to version control
- Add `keys/` directory and `.env` file to `.gitignore`
- Keep private keys secure and backed up
- Rotate keys periodically in production
- Use different keys for development and production

