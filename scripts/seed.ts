#!/usr/bin/env bun

/**
 * Database Seeding Script
 * 
 * This script populates the database with test data:
 * - 1 Faculty
 * - 1 Department
 * - 1 Class
 * - 3 Masterlist entries
 * - 3 Voters (from masterlist)
 * - 1 Active Election
 * - 2 Offices
 * - 2 Candidates
 * 
 * Usage:
 *   bun run scripts/seed.ts
 */

import { db } from '../src/db/db'
import { sql } from 'drizzle-orm'
import { faculties } from '../src/models/faculty.schema'
import { departments } from '../src/models/department.schema'
import { classes } from '../src/models/class.schema'
import { masterlist } from '../src/models/masterlist.schema'
import { voters } from '../src/models/voter.schema'
import { elections } from '../src/models/election.schema'
import { offices } from '../src/models/office.schema'
import { candidates } from '../src/models/candidate.schema'
import { FacultyEnum, DepartmentEnum } from '../src/types/faculty.types'
import * as bcrypt from 'bcryptjs'

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
    await db.execute(sql`TRUNCATE TABLE "departments" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "faculties" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "admins" CASCADE`)
    
    console.log('✅ All existing data dropped\n')
  } catch (error: any) {
    console.warn('⚠️  Warning: Could not drop existing data:', error.message)
    console.log('   Continuing with seed...\n')
  }

  try {
    // 1. Create Faculty
    console.log('📚 Creating faculty...')
    const [faculty] = await db
      .insert(faculties)
      .values({
        name: FacultyEnum.PHYSICAL_SCIENCES,
      })
      .returning()
    console.log(`✅ Created faculty: ${faculty.name} (${faculty.id})\n`)

    // 2. Create Department
    console.log('🏛️  Creating department...')
    const [department] = await db
      .insert(departments)
      .values({
        name: DepartmentEnum.COMPUTER_SCIENCE,
        faculty: faculty.id,
      })
      .returning()
    console.log(`✅ Created department: ${department.name} (${department.id})\n`)

    // 3. Create Class
    console.log('🎓 Creating class...')
    const [classRecord] = await db
      .insert(classes)
      .values({
        level: '400 Level',
        faculty: faculty.id,
        department: department.id,
      })
      .returning()
    console.log(`✅ Created class: ${classRecord.level} (${classRecord.id})\n`)

    // 4. Create Masterlist entries
    console.log('📋 Creating masterlist entries...')
    const masterlistData = [
      { name: 'John Doe', regNo: 'REG001' },
      { name: 'Jane Smith', regNo: 'REG002' },
      { name: 'Bob Johnson', regNo: 'REG003' },
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
      const [voter] = await db
        .insert(voters)
        .values({
          username: entry.regNo.toLowerCase(), // Use regNo as username
          regNumber: entry.regNo,
          class: classRecord.id,
          password: hashedPassword,
        })
        .returning()
      votersList.push(voter)
      console.log(`  ✅ Created voter: ${voter.username} (${voter.regNumber})`)
    }
    console.log(`  📝 Default password for all users: ${defaultPassword}\n`)

    // 6. Create Election (Active, for the class)
    console.log('🗳️  Creating election...')
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7) // Election ends in 7 days

    const [election] = await db
      .insert(elections)
      .values({
        name: 'Class Representative Election 2024',
        type: 'class',
        status: 'active',
        startDate,
        endDate,
        description: 'Election for class representative',
        domainId: classRecord.id, // Election is for this class
      })
      .returning()
    console.log(`✅ Created election: ${election.name} (${election.id})`)
    console.log(`   Status: ${election.status}`)
    console.log(`   Domain: Class (${classRecord.level})\n`)

    // 7. Create Offices
    console.log('🏛️  Creating offices...')
    const officesData = [
      { name: 'Class Representative', description: 'Represents the class in student affairs' },
      { name: 'Assistant Class Representative', description: 'Assists the class representative' },
    ]

    const officesList = []
    for (const data of officesData) {
      const [office] = await db
        .insert(offices)
        .values({
          name: data.name,
          description: data.description,
          election: election.id,
          dependsOn: null, // No dependencies for now
        })
        .returning()
      officesList.push(office)
      console.log(`  ✅ Created office: ${office.name} (${office.id})`)
    }
    console.log()

    // 8. Create Candidates (first 2 voters as candidates)
    console.log('👔 Creating candidates...')
    const candidatesData = [
      { voter: votersList[0], office: officesList[0], quote: 'Together we can make a difference!', manifesto: 'I promise to represent our class with integrity and dedication.' },
      { voter: votersList[1], office: officesList[0], quote: 'Your voice matters!', manifesto: 'I will ensure every student is heard and represented.' },
      { voter: votersList[0], office: officesList[1], quote: 'Supporting our class every step of the way!', manifesto: 'I will assist in all class activities and represent our interests.' },
    ]

    for (const data of candidatesData) {
      const [candidate] = await db
        .insert(candidates)
        .values({
          office: data.office.id,
          voterId: data.voter.id,
          quote: data.quote,
          manifesto: data.manifesto,
        })
        .returning()
      console.log(`  ✅ Created candidate: ${data.voter.username} for ${data.office.name}`)
    }
    console.log()

    // Summary
    console.log('='.repeat(80))
    console.log('✅ Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   - 1 Faculty: ${faculty.name}`)
    console.log(`   - 1 Department: ${department.name}`)
    console.log(`   - 1 Class: ${classRecord.level}`)
    console.log(`   - ${masterlistEntries.length} Masterlist entries`)
    console.log(`   - ${votersList.length} Voters`)
    console.log(`   - 1 Election: ${election.name}`)
    console.log(`   - ${officesList.length} Offices`)
    console.log(`   - ${candidatesData.length} Candidates\n`)
    console.log('🔑 Test Credentials:')
    for (const voter of votersList) {
      console.log(`   Username: ${voter.username} | Reg Number: ${voter.regNumber} | Password: ${defaultPassword}`)
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

