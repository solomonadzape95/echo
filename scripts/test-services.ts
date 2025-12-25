#!/usr/bin/env bun

/**
 * Direct Service Testing Script
 * 
 * This script tests the voting services directly without HTTP,
 * so you don't need the server running.
 * 
 * Usage:
 *   bun run scripts/test-services.ts
 */

import { authService } from '../src/services/auth.service'
import { verifyEligibilityService } from '../src/services/verifyEligibility.service'
import { voteService } from '../src/services/vote.service'
import { blindSignatureService } from '../src/services/blindSignature.service'
import { electionService } from '../src/services/election.service'
import { officeService } from '../src/services/office.service'
import { candidateService } from '../src/services/candidate.service'
import * as crypto from 'crypto'

async function testServices() {
  console.log('='.repeat(80))
  console.log('🧪 Testing Services Directly (No HTTP Required)')
  console.log('='.repeat(80))
  console.log()

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Testing Login...')
    const loginResult = await authService.login({
      regNumber: 'REG001',
      password: 'password123',
    })
    console.log(`✅ Login successful!`)
    console.log(`   User: ${loginResult.user.username} (${loginResult.user.regNumber})`)
    console.log(`   User ID: ${loginResult.user.id}`)
    console.log(`   Access Token: ${loginResult.accessToken.substring(0, 50)}...`)
    console.log()

    // Step 2: Get active elections
    console.log('📋 Step 2: Getting active elections...')
    const activeElections = await electionService.getActive()
    if (activeElections.length === 0) {
      throw new Error('No active elections found. Please run seed script first.')
    }
    const election = activeElections[0]
    console.log(`✅ Found election: ${election.name} (${election.id})`)
    console.log(`   Type: ${election.type}`)
    console.log(`   Status: ${election.status}`)
    console.log()

    // Step 3: Verify eligibility & get token
    console.log('✅ Step 3: Verifying eligibility...')
    const eligibilityResult = await verifyEligibilityService.verifyAndCreateToken(
      loginResult.user.id,
      election.id
    )
    console.log(`✅ Eligibility verified!`)
    console.log(`   Token hash: ${eligibilityResult.token.tokenHash}`)
    console.log(`   Public key: ${eligibilityResult.publicKey.substring(0, 50)}...`)
    console.log()

    // Step 4: Get offices and candidates
    console.log('📋 Step 4: Getting offices and candidates...')
    const offices = await officeService.getByElection(election.id)
    if (offices.length === 0) {
      throw new Error('No offices found for this election')
    }
    console.log(`✅ Found ${offices.length} office(s):`)
    for (const office of offices) {
      console.log(`   - ${office.name} (${office.id})`)
    }
    console.log()

    // Get candidates for first office
    const firstOffice = offices[0]
    const candidates = await candidateService.getByOffice(firstOffice.id)
    if (candidates.length === 0) {
      throw new Error('No candidates found for this office')
    }
    console.log(`✅ Found ${candidates.length} candidate(s) for ${firstOffice.name}:`)
    for (const candidate of candidates) {
      console.log(`   - Candidate ${candidate.id}`)
    }
    console.log()

    // Step 5: Prepare vote data
    console.log('🗳️  Step 5: Preparing vote data...')
    const voteData: Record<string, string> = {}
    voteData[firstOffice.id] = candidates[0].id

    const voteDataString = JSON.stringify(voteData)
    const voteDataHash = crypto.createHash('sha256').update(voteDataString).digest('hex')
    console.log(`✅ Vote data prepared:`)
    console.log(`   Office: ${firstOffice.name}`)
    console.log(`   Candidate: ${candidates[0].id}`)
    console.log(`   Vote data hash: ${voteDataHash.substring(0, 50)}...`)
    console.log()

    // Step 6: Get previous hash (for chain)
    console.log('🔗 Step 6: Getting previous hash for vote chain...')
    const existingVotes = await voteService.getByElection(election.id)
    let prevHash: string
    if (existingVotes.length === 0) {
      prevHash = '0000000000000000000000000000000000000000000000000000000000000000' // Genesis
      console.log(`✅ This will be the genesis vote (first vote)`)
    } else {
      const lastVote = existingVotes[0] // Already sorted by desc
      prevHash = lastVote.currentHash
      console.log(`✅ Previous hash: ${prevHash.substring(0, 50)}...`)
    }
    console.log()

    // Step 7: Create current hash
    const currentHashInput = `${voteDataHash}:${prevHash}:${eligibilityResult.token.tokenHash}`
    const currentHash = crypto.createHash('sha256').update(currentHashInput).digest('hex')
    console.log(`✅ Current hash: ${currentHash.substring(0, 50)}...`)
    console.log()

    // Step 8: Cast vote (atomic transaction)
    console.log('🗳️  Step 8: Casting vote (atomic transaction)...')
    const voteResult = await voteService.create(
      {
        electionId: election.id,
        tokenId: eligibilityResult.token.tokenHash,
        voteDataHash,
        voteData, // Optional - will be encrypted
        currentHash,
        prevHash,
      },
      loginResult.user.id
    )
    console.log(`✅ Vote cast successfully!`)
    console.log(`   Vote ID: ${voteResult.vote.id}`)
    console.log(`   Receipt Code: ${voteResult.receipt.receiptCode}`)
    console.log(`   Current Hash: ${voteResult.vote.currentHash.substring(0, 50)}...`)
    console.log()

    // Step 9: Verify vote chain
    console.log('🔗 Step 9: Verifying vote chain...')
    const chainVerification = await voteService.verifyChain(election.id)
    console.log(`✅ Chain verification: ${chainVerification.valid ? 'VALID' : 'INVALID'}`)
    console.log(`   Message: ${chainVerification.message}`)
    if ('voteCount' in chainVerification) {
      console.log(`   Vote count: ${chainVerification.voteCount}`)
    }
    console.log()

    // Summary
    console.log('='.repeat(80))
    console.log('✅ All service tests completed successfully!')
    console.log('='.repeat(80))
    console.log()
    console.log('📊 Summary:')
    console.log(`   ✅ Login: Success`)
    console.log(`   ✅ Eligibility: Verified`)
    console.log(`   ✅ Token: Created`)
    console.log(`   ✅ Vote: Cast successfully`)
    console.log(`   ✅ Receipt: ${voteResult.receipt.receiptCode}`)
    console.log(`   ✅ Chain: ${chainVerification.valid ? 'Valid' : 'Invalid'}`)
    console.log()
    console.log('💡 You can run this multiple times to test the vote chain!')
    console.log()

  } catch (error: any) {
    console.error('❌ Error during service test:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run test
testServices()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

