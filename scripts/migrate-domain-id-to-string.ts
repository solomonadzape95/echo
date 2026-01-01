#!/usr/bin/env bun

/**
 * Migration Script: Convert elections.domain_id from UUID to VARCHAR
 * 
 * This script:
 * 1. Converts the domain_id column from UUID to VARCHAR(255)
 * 2. Preserves all existing data (UUIDs are valid strings)
 * 
 * Usage:
 *   bun run scripts/migrate-domain-id-to-string.ts
 */

import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

const sql = postgres(connectionString)

async function migrate() {
  console.log('🔄 Starting migration: Convert domain_id from UUID to VARCHAR...\n')

  try {
    // Step 1: Check current column type
    console.log('📋 Checking current schema...')
    const currentType = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'elections' 
      AND column_name = 'domain_id'
    `

    if (currentType.length === 0) {
      console.error('❌ domain_id column not found in elections table')
      process.exit(1)
    }

    const currentDataType = currentType[0].data_type
    console.log(`   Current type: ${currentDataType}\n`)

    if (currentDataType === 'character varying' || currentDataType === 'varchar') {
      console.log('✅ domain_id is already VARCHAR. No migration needed.')
      await sql.end()
      process.exit(0)
    }

    // Step 2: Convert UUID to VARCHAR
    console.log('🔄 Converting domain_id from UUID to VARCHAR(255)...')
    await sql`
      ALTER TABLE elections 
      ALTER COLUMN domain_id TYPE VARCHAR(255) 
      USING domain_id::text
    `

    console.log('✅ Migration completed successfully!\n')
    console.log('📝 Summary:')
    console.log('   - domain_id column is now VARCHAR(255)')
    console.log('   - Can accept UUIDs (for class elections)')
    console.log('   - Can accept enum strings (for department/faculty elections)')
    console.log('   - All existing data preserved\n')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

