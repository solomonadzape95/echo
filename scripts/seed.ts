#!/usr/bin/env bun

/**
 * Database Seeding Script
 * 
 * This script populates the database with test data:
 * - 1 Class (with faculty and department enum values)
 * - 3 Masterlist entries
 * - 3 Voters (from masterlist)
 * - 1 Active Election
 * - 2 Offices
 * - 3 Candidates
 * 
 * Usage:
 *   bun run scripts/seed.ts
 */

import { db } from '../src/db/db'
import { sql, eq } from 'drizzle-orm'
import { classes } from '../src/models/class.schema'
import { masterlist } from '../src/models/masterlist.schema'
import { voters } from '../src/models/voter.schema'
import { elections } from '../src/models/election.schema'
import { offices } from '../src/models/office.schema'
import { candidates } from '../src/models/candidate.schema'
import { votes } from '../src/models/vote.schema'
import { tokens } from '../src/models/token.schema'
import { issuances } from '../src/models/issuance.schema'
import { receipts } from '../src/models/receipt.schema'
import { admins } from '../src/models/admin.schema'
import { FacultyEnum, DepartmentEnum } from '../src/types/faculty.types'
import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'

async function seed() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Drop all data (in reverse order of dependencies)
    console.log('🗑️  Dropping existing data...')
    
    await db.execute(sql`TRUNCATE TABLE "candidates" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "offices" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "votes" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "receipts" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "tokens" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "refresh_tokens" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "issuances" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "elections" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "voters" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "masterlist" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "classes" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "admins" CASCADE`)
    
    console.log('✅ All existing data dropped\n')
  } catch (error: any) {
    console.warn('⚠️  Warning: Could not drop existing data:', error.message)
    console.log('   Continuing with seed...\n')
  }

  try {
    // 1. Create Class (now using enum values directly)
    console.log('🎓 Creating class...')
    const facultyName = FacultyEnum.PHYSICAL_SCIENCES
    const departmentName = DepartmentEnum.COMPUTER_SCIENCE
    
    const [classRecord] = await db
      .insert(classes)
      .values({
        level: '400 Level',
        faculty: facultyName, // Now using enum value directly
        department: departmentName, // Now using enum value directly
      })
      .returning()
    console.log(`✅ Created class: ${classRecord.level}`)
    console.log(`   Faculty: ${facultyName}`)
    console.log(`   Department: ${departmentName}`)
    console.log(`   ID: ${classRecord.id}\n`)

    // 4. Create Masterlist entries
    console.log('📋 Creating masterlist entries...')
    const masterlistData = [
      { name: 'John Doe', regNo: 'REG001' },
      { name: 'Jane Smith', regNo: 'REG002' },
      { name: 'Bob Johnson', regNo: 'REG003' },
      { name: 'Alice Williams', regNo: 'REG004' },
      { name: 'Charlie Brown', regNo: 'REG005' },
      { name: 'Diana Prince', regNo: 'REG006' },
      { name: 'Edward Norton', regNo: 'REG007' },
      { name: 'Fiona Apple', regNo: 'REG008' },
      { name: 'George Lucas', regNo: 'REG009' },
      { name: 'Helen Keller', regNo: 'REG010' },
    ]

    const masterlistEntries = []
    for (const data of masterlistData) {
      const [entry] = await db
        .insert(masterlist)
        .values({
          name: data.name,
          regNo: data.regNo,
          class: classRecord.id,
          activated: true, // Activate all for testing
        })
        .returning()
      masterlistEntries.push(entry)
      console.log(`  ✅ Created masterlist entry: ${entry.name} (${entry.regNo})`)
    }
    console.log()

    // 5. Create Voters (from masterlist)
    console.log('👤 Creating voters...')
    const defaultPassword = 'password123' // Same password for all test users
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const votersList = []
    for (const entry of masterlistEntries) {
      // Use name from masterlist entry as username
      const [voter] = await db
        .insert(voters)
        .values({
          username: entry.name, // Use name from masterlist as username
          regNumber: entry.regNo,
          class: classRecord.id,
          password: hashedPassword,
        })
        .returning()
      votersList.push(voter)
      console.log(`  ✅ Created voter: ${voter.username} (${voter.regNumber})`)
    }
    console.log(`  📝 Default password for all users: ${defaultPassword}\n`)

    // 5.5. Create Admin Account
    console.log('👨‍💼 Creating admin account...')
    const adminPassword = 'admin123'
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10)
    
    const [admin] = await db
      .insert(admins)
      .values({
        username: 'admin',
        email: 'admin@example.com',
        password: adminHashedPassword,
        role: 'super_admin',
        fullName: 'System Administrator',
      })
      .returning()
    console.log(`✅ Created admin: ${admin.username}`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Password: ${adminPassword}\n`)

    // 6. Create Elections (Active, Completed, Upcoming)
    console.log('🗳️  Creating elections...')
    
    // Completed Election (ended 3 days ago)
    const completedStartDate = new Date()
    completedStartDate.setDate(completedStartDate.getDate() - 10)
    const completedEndDate = new Date()
    completedEndDate.setDate(completedEndDate.getDate() - 3)
    
    const [completedElection] = await db
      .insert(elections)
      .values({
        name: 'Class Representative Election 2024 (Completed)',
        type: 'class',
        status: 'completed',
        startDate: completedStartDate,
        endDate: completedEndDate,
        description: 'Completed election for class representative',
        domainId: classRecord.id,
      })
      .returning()
    console.log(`✅ Created completed election: ${completedElection.name}`)
    
    // Active Election (current)
    const activeStartDate = new Date()
    activeStartDate.setDate(activeStartDate.getDate() - 1)
    const activeEndDate = new Date()
    activeEndDate.setDate(activeEndDate.getDate() + 6) // Election ends in 6 days

    const [activeElection] = await db
      .insert(elections)
      .values({
        name: 'Class Representative Election 2024 (Active)',
        type: 'class',
        status: 'active',
        startDate: activeStartDate,
        endDate: activeEndDate,
        description: 'Active election for class representative',
        domainId: classRecord.id,
      })
      .returning()
    console.log(`✅ Created active election: ${activeElection.name}`)
    
    // Upcoming Election (starts in 7 days)
    const upcomingStartDate = new Date()
    upcomingStartDate.setDate(upcomingStartDate.getDate() + 7)
    const upcomingEndDate = new Date()
    upcomingEndDate.setDate(upcomingEndDate.getDate() + 14)
    
    const [upcomingElection] = await db
      .insert(elections)
      .values({
        name: 'Class Representative Election 2025 (Upcoming)',
        type: 'class',
        status: 'pending',
        startDate: upcomingStartDate,
        endDate: upcomingEndDate,
        description: 'Upcoming election for class representative',
        domainId: classRecord.id,
      })
      .returning()
    console.log(`✅ Created upcoming election: ${upcomingElection.name}`)
    console.log()

    // 7. Create Offices for each election
    console.log('🏛️  Creating offices...')
    const officesData = [
      { name: 'Class Representative', description: 'Represents the class in student affairs' },
      { name: 'Assistant Class Representative', description: 'Assists the class representative' },
      { name: 'Secretary', description: 'Handles class documentation and records' },
    ]

    // Offices for completed election
    const completedOffices = []
    for (const data of officesData) {
      const [office] = await db
        .insert(offices)
        .values({
          name: data.name,
          description: data.description,
          election: completedElection.id,
          dependsOn: null,
        })
        .returning()
      completedOffices.push(office)
      console.log(`  ✅ Created office for completed election: ${office.name}`)
    }
    
    // Offices for active election
    const activeOffices = []
    for (const data of officesData) {
      const [office] = await db
        .insert(offices)
        .values({
          name: data.name,
          description: data.description,
          election: activeElection.id,
          dependsOn: null,
        })
        .returning()
      activeOffices.push(office)
      console.log(`  ✅ Created office for active election: ${office.name}`)
    }
    
    // Offices for upcoming election
    const upcomingOffices = []
    for (const data of officesData) {
      const [office] = await db
        .insert(offices)
        .values({
          name: data.name,
          description: data.description,
          election: upcomingElection.id,
          dependsOn: null,
        })
        .returning()
      upcomingOffices.push(office)
      console.log(`  ✅ Created office for upcoming election: ${office.name}`)
    }
    console.log()

    // 8. Create Candidates for each election
    console.log('👔 Creating candidates...')
    
    // Candidates for completed election
    const completedCandidates = []
    const completedCandidatesData = [
      { voter: votersList[0], office: completedOffices[0], quote: 'Together we can make a difference!', manifesto: 'I promise to represent our class with integrity and dedication.' },
      { voter: votersList[1], office: completedOffices[0], quote: 'Your voice matters!', manifesto: 'I will ensure every student is heard and represented.' },
      { voter: votersList[2], office: completedOffices[0], quote: 'Progress through unity!', manifesto: 'I will work to unite our class and achieve common goals.' },
      { voter: votersList[3], office: completedOffices[1], quote: 'Supporting our class every step of the way!', manifesto: 'I will assist in all class activities and represent our interests.' },
      { voter: votersList[4], office: completedOffices[1], quote: 'Dedicated service!', manifesto: 'I am committed to serving our class with dedication.' },
      { voter: votersList[5], office: completedOffices[2], quote: 'Organized and efficient!', manifesto: 'I will maintain accurate records and ensure smooth communication.' },
    ]
    
    for (const data of completedCandidatesData) {
      const [candidate] = await db
        .insert(candidates)
        .values({
          office: data.office.id,
          voterId: data.voter.id,
          quote: data.quote,
          manifesto: data.manifesto,
        })
        .returning()
      completedCandidates.push(candidate)
      console.log(`  ✅ Created candidate for completed election: ${data.voter.username} for ${data.office.name}`)
    }
    
    // Candidates for active election
    const activeCandidatesData = [
      { voter: votersList[0], office: activeOffices[0], quote: 'New vision for our class!', manifesto: 'I bring fresh ideas and commitment to excellence.' },
      { voter: votersList[1], office: activeOffices[0], quote: 'Experience and dedication!', manifesto: 'I have the experience to lead our class effectively.' },
      { voter: votersList[3], office: activeOffices[1], quote: 'Ready to assist!', manifesto: 'I will support the class representative in all endeavors.' },
    ]
    
    for (const data of activeCandidatesData) {
      const [candidate] = await db
        .insert(candidates)
        .values({
          office: data.office.id,
          voterId: data.voter.id,
          quote: data.quote,
          manifesto: data.manifesto,
        })
        .returning()
      console.log(`  ✅ Created candidate for active election: ${data.voter.username} for ${data.office.name}`)
    }
    console.log()

    // 9. Create Votes for Completed Election
    console.log('🗳️  Creating votes for completed election...')
    
    // Generate tokens and issuances for voters who voted
    const votingVoters = votersList.slice(0, 7) // First 7 voters voted
    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000' // Genesis hash
    
    for (let i = 0; i < votingVoters.length; i++) {
      const voter = votingVoters[i]
      
      // Generate token hash
      const tokenHash = crypto.createHash('sha256')
        .update(`${voter.id}-${completedElection.id}`)
        .digest('hex')
      
      // Create token
      const [token] = await db
        .insert(tokens)
        .values({
          tokenHash,
          election: completedElection.id,
          usedAt: new Date(completedEndDate.getTime() - (votingVoters.length - i) * 60000), // Stagger vote times
        })
        .returning()
      
      // Create issuance
      await db
        .insert(issuances)
        .values({
          voterId: voter.id,
          election: completedElection.id,
          tokenHash: token.tokenHash,
        })
      
      // Create vote data (random selections for testing)
      const voteData: Record<string, string> = {}
      
      // Vote for Class Representative (random candidate, but not yourself)
      if (completedOffices[0]) {
        const isCandidateForOffice = completedCandidatesData.some(cd => 
          cd.voter.id === voter.id && cd.office.id === completedOffices[0].id
        )
        
        if (!isCandidateForOffice) {
          // Only vote if this voter is not a candidate for this office
          const candidatesForOffice = completedCandidatesData.filter(cd => cd.office.id === completedOffices[0].id)
          if (candidatesForOffice.length > 0) {
            const selectedCandidate = candidatesForOffice[i % candidatesForOffice.length]
            const candidateRecord = completedCandidates.find(c => c.voterId === selectedCandidate.voter.id && c.office === completedOffices[0]!.id)
            if (candidateRecord) {
              voteData[completedOffices[0].id] = candidateRecord.id
            }
          }
        }
      }
      
      // Vote for Assistant (if office exists and voter didn't vote for themselves)
      if (completedOffices[1] && i < 5) {
        const isCandidateForOffice = completedCandidatesData.some(cd => 
          cd.voter.id === voter.id && cd.office.id === completedOffices[1].id
        )
        
        if (!isCandidateForOffice) {
          const candidatesForOffice = completedCandidatesData.filter(cd => cd.office.id === completedOffices[1].id)
          if (candidatesForOffice.length > 0) {
            const selectedCandidate = candidatesForOffice[i % candidatesForOffice.length]
            const candidateRecord = completedCandidates.find(c => c.voterId === selectedCandidate.voter.id && c.office === completedOffices[1]!.id)
            if (candidateRecord) {
              voteData[completedOffices[1].id] = candidateRecord.id
            }
          }
        }
      }
      
      // Vote for Secretary (if office exists)
      if (completedOffices[2] && i < 6) {
        const isCandidateForOffice = completedCandidatesData.some(cd => 
          cd.voter.id === voter.id && cd.office.id === completedOffices[2].id
        )
        
        if (!isCandidateForOffice) {
          const candidatesForOffice = completedCandidatesData.filter(cd => cd.office.id === completedOffices[2].id)
          if (candidatesForOffice.length > 0) {
            const selectedCandidate = candidatesForOffice[i % candidatesForOffice.length]
            const candidateRecord = completedCandidates.find(c => c.voterId === selectedCandidate.voter.id && c.office === completedOffices[2]!.id)
            if (candidateRecord) {
              voteData[completedOffices[2].id] = candidateRecord.id
            }
          }
        }
      }
      
      // Calculate vote data hash
      const voteDataString = JSON.stringify(voteData)
      const voteDataHash = crypto.createHash('sha256').update(voteDataString).digest('hex')
      
      // Calculate current hash
      const currentHash = crypto.createHash('sha256')
        .update(voteDataHash + prevHash + token.tokenHash)
        .digest('hex')
      
      // Create vote
      const [vote] = await db
        .insert(votes)
        .values({
          prevHash,
          currentHash,
          voteDataHash,
          encryptedVoteData: voteDataString, // For testing, store plain text (in production this would be encrypted)
          tokenId: token.tokenHash,
          election: completedElection.id,
        })
        .returning()
      
      // Create receipt
      const receiptCode = Array.from({ length: 8 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      ).join('')
      
      await db
        .insert(receipts)
        .values({
          receiptCode,
          election: completedElection.id,
          voteId: vote.id,
        })
      
      prevHash = currentHash
      console.log(`  ✅ Created vote for ${voter.username} (Receipt: ${receiptCode})`)
    }
    console.log()

    // Summary
    console.log('='.repeat(80))
    console.log('✅ Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   - 1 Faculty: ${facultyName}`)
    console.log(`   - 1 Department: ${departmentName}`)
    console.log(`   - 1 Class: ${classRecord.level}`)
    console.log(`   - ${masterlistEntries.length} Masterlist entries`)
    console.log(`   - ${votersList.length} Voters`)
    console.log(`   - 3 Elections:`)
    console.log(`     • Completed: ${completedElection.name}`)
    console.log(`     • Active: ${activeElection.name}`)
    console.log(`     • Upcoming: ${upcomingElection.name}`)
    console.log(`   - ${completedOffices.length + activeOffices.length + upcomingOffices.length} Offices total`)
    console.log(`   - ${completedCandidates.length + activeCandidatesData.length} Candidates`)
    console.log(`   - ${votingVoters.length} Votes in completed election\n`)
    console.log('🔑 Test Credentials:')
    console.log(`\n   👨‍💼 Admin:`)
    console.log(`      Username: admin`)
    console.log(`      Password: ${adminPassword}`)
    console.log(`\n   👤 Voters:`)
    for (const voter of votersList) {
      console.log(`      Username: ${voter.username} | Reg Number: ${voter.regNumber} | Password: ${defaultPassword}`)
    }
    console.log('\n' + '='.repeat(80))
    console.log('\n💡 You can now test the voting flow using the test scripts!\n')

  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run seed
seed()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

