# Testing Scripts

## Database Seeding

Populate the database with test data:

```bash
bun run seed
```

This creates:
- 1 Faculty (Physical Sciences)
- 1 Department (Computer Science)
- 1 Class (400 Level)
- 3 Masterlist entries (REG001, REG002, REG003)
- 3 Voters (from masterlist)
- 1 Active Election (Class Representative Election)
- 2 Offices (Class Rep, Assistant Class Rep)
- 3 Candidates

**Default Password for all test users:** `password123`

## Testing Voting Flow

### Option 1: Direct Service Testing (No Server Required) ⭐ Recommended

Test the services directly without HTTP - **no server needed**:

```bash
bun run test:services
```

This tests:
- Login service
- Eligibility verification
- Token creation
- Vote casting (atomic transaction)
- Vote chain verification

**Advantages:**
- ✅ No server required
- ✅ Faster execution
- ✅ Direct service testing
- ✅ Better for debugging

### Option 2: HTTP Endpoint Testing (Server Required)

Test the complete voting process via HTTP (simulates client-side):

```bash
# Start server first
bun run dev

# Then in another terminal, test with default user (REG001)
bun run test:voting

# Test with specific user
bun run test:voting REG002

# Test with specific user and election
bun run test:voting REG001 <election-id>
```

### What the test script does:

1. **Login** - Authenticates as the test user
2. **Verify Eligibility** - Checks if user can vote and gets token
3. **Blind & Sign Token** - Blinds token and gets server signature
4. **Fetch Offices & Candidates** - Gets available offices and candidates
5. **Cast Vote** - Submits vote with encrypted data
6. **Verify Receipt** - Checks receipt code (if endpoint exists)

### Example Output:

```
🧪 Testing Voting Flow (Client-Side Simulation)
🔐 Step 1: Logging in...
✅ Logged in as: reg001
✅ Step 2: Verifying eligibility...
✅ Eligibility verified!
🔒 Step 3: Blinding token and getting signature...
✅ Token signed!
🗳️  Step 4: Casting vote...
✅ Vote cast successfully!
   Receipt Code: ABC12345
```

## Manual Testing

You can also test individual endpoints manually:

### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"regNumber":"REG001","password":"password123"}' \
  -c cookies.txt
```

### 2. Verify Eligibility
```bash
curl -X GET "http://localhost:3000/verify-eligibility?electionId=<election-id>" \
  -b cookies.txt
```

### 3. Get Public Key
```bash
curl -X GET "http://localhost:3000/verify-eligibility/public-key"
```

### 4. Sign Blinded Token
```bash
curl -X POST http://localhost:3000/verify-eligibility/sign \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"blindedToken":"<hex>","electionId":"<election-id>"}'
```

### 5. Cast Vote
```bash
curl -X POST http://localhost:3000/vote \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "electionId":"<election-id>",
    "tokenId":"<signed-token-hash>",
    "voteDataHash":"<hash>",
    "voteData":{"<office-id>":"<candidate-id>"},
    "currentHash":"<hash>"
  }'
```

## Prerequisites

1. **Database migrated:**
   ```bash
   bun run db:migrate
   ```

2. **RSA keys generated:**
   ```bash
   bun run generate:rsa-keys
   ```

3. **Server running:**
   ```bash
   bun run dev
   ```

4. **Seed database:**
   ```bash
   bun run seed
   ```

## Test Users

After seeding, you can use these credentials:

| Username | Reg Number | Password |
|----------|------------|----------|
| reg001   | REG001     | password123 |
| reg002   | REG002     | password123 |
| reg003   | REG003     | password123 |

## Troubleshooting

### "No active elections found"
- Run the seed script: `bun run seed`
- Check that election status is 'active'

### "Eligibility check failed"
- Ensure voter exists in masterlist
- Check that election domainId matches voter's class

### "Token signing failed"
- Verify RSA keys are set in `.env`
- Check that token exists for voter and election

### "Vote failed"
- Ensure token hasn't been used already
- Check that all required fields are provided
- Verify vote data hash matches vote data

