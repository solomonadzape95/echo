#!/usr/bin/env bun

/**
 * Voting Test Script (Client-Side Simulation)
 * 
 * This script simulates the complete client-side voting flow:
 * 1. Login
 * 2. Verify eligibility & get token
 * 3. Blind token & get signature
 * 4. Cast vote
 * 5. Verify receipt
 * 
 * Usage:
 *   bun run scripts/test-voting.ts [regNumber] [electionId]
 * 
 * Example:
 *   bun run scripts/test-voting.ts REG001
 */

import * as crypto from 'crypto'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000'

interface VoteData {
  officeId: string
  candidateId: string
}

// Helper function to make API requests
async function apiRequest(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    cookies?: string[]
  } = {}
) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  }

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  // Handle cookies
  if (options.cookies) {
    headers['Cookie'] = options.cookies.join('; ')
  }

  const response = await fetch(url, fetchOptions)
  const data = await response.json()

  // Extract cookies from response
  const setCookieHeaders = response.headers.getSetCookie()
  const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0])

  return { data, cookies, status: response.status }
}

// Step 1: Login
async function login(regNumber: string, password: string) {
  console.log('🔐 Step 1: Logging in...')
  const { data, cookies } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { regNumber, password },
  })

  if (!data.success) {
    throw new Error(`Login failed: ${data.message}`)
  }

  console.log(`✅ Logged in as: ${data.data.user.username}`)
  console.log(`   User ID: ${data.data.user.id}`)
  console.log(`   Cookies received: ${cookies.length} cookies\n`)

  return { user: data.data.user, cookies }
}

// Step 2: Verify eligibility & get token
async function verifyEligibility(electionId: string, cookies: string[]) {
  console.log('✅ Step 2: Verifying eligibility...')
  const { data, cookies: newCookies } = await apiRequest(
    `/verify-eligibility?electionId=${electionId}`,
    {
      method: 'GET',
      cookies,
    }
  )

  if (!data.success) {
    throw new Error(`Eligibility check failed: ${data.message}`)
  }

  console.log(`✅ Eligibility verified!`)
  console.log(`   Token hash: ${data.data.token.tokenHash}`)
  console.log(`   Public key received: ${data.data.publicKey.substring(0, 50)}...\n`)

  return {
    token: data.data.token,
    publicKey: data.data.publicKey,
    cookies: newCookies.length > 0 ? newCookies : cookies,
  }
}

// Step 3: Blind token & get signature (simplified - in production, use proper RSA blinding)
async function blindAndSignToken(
  tokenHash: string,
  publicKey: string,
  electionId: string,
  cookies: string[]
) {
  console.log('🔒 Step 3: Blinding token and getting signature...')
  
  // In a real implementation, you would:
  // 1. Extract RSA parameters (n, e) from publicKey PEM
  // 2. Generate random blinding factor r
  // 3. Blind: blinded = token * r^e mod n
  // 4. Send blinded token to server
  // 5. Unblind: signature = signed_blinded * r^(-1) mod n
  
  // For testing, we'll use a simplified approach
  // In production, use the proper RSA blinding from blindSignature.helpers.ts
  const blindedToken = Buffer.from(tokenHash).toString('hex') // Simplified - not real blinding

  const { data } = await apiRequest('/verify-eligibility/sign', {
    method: 'POST',
    body: {
      blindedToken,
      electionId,
    },
    cookies,
  })

  if (!data.success) {
    throw new Error(`Token signing failed: ${data.message}`)
  }

  console.log(`✅ Token signed!`)
  console.log(`   Signature: ${data.data.signature.substring(0, 50)}...\n`)

  return {
    signature: data.data.signature,
    tokenHash: data.data.tokenHash,
  }
}

// Step 4: Cast vote
async function castVote(
  electionId: string,
  tokenHash: string,
  voteData: VoteData[],
  cookies: string[]
) {
  console.log('🗳️  Step 4: Casting vote...')

  // Create vote data object
  const voteDataObj: Record<string, string> = {}
  for (const vote of voteData) {
    voteDataObj[vote.officeId] = vote.candidateId
  }

  // Hash the vote data using crypto
  const voteDataString = JSON.stringify(voteDataObj)
  const voteDataHash = crypto.createHash('sha256').update(voteDataString).digest('hex')

  // Create current hash (hash of voteDataHash + prevHash + tokenHash)
  // For testing, we'll use a simple hash. In production, get prevHash from chain
  const currentHashInput = `${voteDataHash}:${tokenHash}`
  const currentHash = crypto.createHash('sha256').update(currentHashInput).digest('hex')

  const { data } = await apiRequest('/vote', {
    method: 'POST',
    body: {
      electionId,
      tokenId: tokenHash,
      voteDataHash,
      voteData: voteDataObj, // Optional - will be encrypted server-side
      currentHash,
    },
    cookies,
  })

  if (!data.success) {
    throw new Error(`Vote failed: ${data.message}`)
  }

  console.log(`✅ Vote cast successfully!`)
  console.log(`   Vote ID: ${data.data.vote.id}`)
  console.log(`   Receipt Code: ${data.data.receipt.code}`)
  console.log(`   Current Hash: ${data.data.vote.currentHash.substring(0, 50)}...\n`)

  return {
    vote: data.data.vote,
    receipt: data.data.receipt,
  }
}

// Step 5: Verify receipt (optional)
async function verifyReceipt(receiptCode: string) {
  console.log('🔍 Step 5: Verifying receipt...')
  
  // Note: This endpoint might not exist yet, but we'll try
  try {
    const { data } = await apiRequest(`/receipt?code=${receiptCode}`, {
      method: 'GET',
    })

    if (data.success) {
      console.log(`✅ Receipt verified!`)
      console.log(`   Receipt ID: ${data.data.id}`)
      console.log(`   Election: ${data.data.election}\n`)
    }
  } catch (error: any) {
    console.log(`⚠️  Receipt verification endpoint not available: ${error.message}\n`)
  }
}

// Main test function
async function testVoting(regNumber: string, electionId?: string) {
  console.log('='.repeat(80))
  console.log('🧪 Testing Voting Flow (Client-Side Simulation)')
  console.log('='.repeat(80))
  console.log()

  try {
    // Step 1: Login
    const { user, cookies } = await login(regNumber, 'password123')

    // Step 2: Get election ID if not provided
    let finalElectionId = electionId
    if (!finalElectionId) {
      console.log('📋 Fetching active elections...')
      const { data } = await apiRequest('/election/active', {
        method: 'GET',
        cookies,
      })

      if (!data.success || !data.data || data.data.length === 0) {
        throw new Error('No active elections found. Please run seed script first.')
      }

      finalElectionId = data.data[0].id
      console.log(`✅ Found active election: ${data.data[0].name} (${finalElectionId})\n`)
    }

    // Step 2: Verify eligibility & get token
    const { token, publicKey, cookies: updatedCookies } = await verifyEligibility(
      finalElectionId,
      cookies
    )

    // Step 3: Blind token & get signature
    const { signature, tokenHash } = await blindAndSignToken(
      token.tokenHash,
      publicKey,
      finalElectionId,
      updatedCookies
    )

    // Step 4: Get offices and candidates for the election
    console.log('📋 Fetching offices and candidates...')
    const { data: officesData } = await apiRequest(
      `/office/by-election?electionId=${finalElectionId}`,
      {
        method: 'GET',
        cookies: updatedCookies,
      }
    )

    if (!officesData.success || !officesData.data || officesData.data.length === 0) {
      throw new Error('No offices found for this election')
    }

    const offices = officesData.data
    console.log(`✅ Found ${offices.length} office(s)\n`)

    // Get candidates for each office
    const voteData: VoteData[] = []
    for (const office of offices) {
      const { data: candidatesData } = await apiRequest(
        `/candidate/by-office?officeId=${office.id}`,
        {
          method: 'GET',
          cookies: updatedCookies,
        }
      )

      if (candidatesData.success && candidatesData.data && candidatesData.data.length > 0) {
        // Vote for the first candidate
        const candidate = candidatesData.data[0]
        voteData.push({
          officeId: office.id,
          candidateId: candidate.id,
        })
        console.log(`✅ Selected candidate: ${candidate.id} for office: ${office.name}`)
      }
    }

    if (voteData.length === 0) {
      throw new Error('No candidates found to vote for')
    }
    console.log()

    // Step 4: Cast vote
    const { vote, receipt } = await castVote(
      finalElectionId,
      tokenHash,
      voteData,
      updatedCookies
    )

    // Step 5: Verify receipt
    await verifyReceipt(receipt.code)

    // Summary
    console.log('='.repeat(80))
    console.log('✅ Voting test completed successfully!')
    console.log('='.repeat(80))
    console.log()
    console.log('📊 Summary:')
    console.log(`   User: ${user.username} (${user.regNumber})`)
    console.log(`   Election: ${finalElectionId}`)
    console.log(`   Vote ID: ${vote.id}`)
    console.log(`   Receipt Code: ${receipt.code}`)
    console.log()
    console.log('💡 Save your receipt code to verify your vote later!')
    console.log()

  } catch (error: any) {
    console.error('❌ Error during voting test:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const regNumber = args[0] || 'REG001'
const electionId = args[1]

// Run test
testVoting(regNumber, electionId)
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

