#!/usr/bin/env bun

/**
 * Database Cleanup Script
 * 
 * This script deletes all data from the database (truncates all tables).
 * Useful for resetting the database during development.
 * 
 * Usage:
 *   bun run scripts/cleanup.ts
 * 
 * WARNING: This will delete ALL data from the database!
 */

import { db } from '../src/db/db'
import { sql } from 'drizzle-orm'

async function cleanup() {
  console.log('🗑️  Starting database cleanup...\n')
  console.log('⚠️  WARNING: This will delete ALL data from the database!\n')

  try {
    // Truncate all tables in reverse order of dependencies
    console.log('Deleting data from tables...')
    
    await db.execute(sql`TRUNCATE TABLE "candidates" CASCADE`)
    console.log('  ✅ Cleared candidates')
    
    await db.execute(sql`TRUNCATE TABLE "offices" CASCADE`)
    console.log('  ✅ Cleared offices')
    
    await db.execute(sql`TRUNCATE TABLE "votes" CASCADE`)
    console.log('  ✅ Cleared votes')
    
    await db.execute(sql`TRUNCATE TABLE "receipts" CASCADE`)
    console.log('  ✅ Cleared receipts')
    
    await db.execute(sql`TRUNCATE TABLE "tokens" CASCADE`)
    console.log('  ✅ Cleared tokens')
    
    await db.execute(sql`TRUNCATE TABLE "refresh_tokens" CASCADE`)
    console.log('  ✅ Cleared refresh_tokens')
    
    await db.execute(sql`TRUNCATE TABLE "issuances" CASCADE`)
    console.log('  ✅ Cleared issuances')
    
    await db.execute(sql`TRUNCATE TABLE "elections" CASCADE`)
    console.log('  ✅ Cleared elections')
    
    await db.execute(sql`TRUNCATE TABLE "voters" CASCADE`)
    console.log('  ✅ Cleared voters')
    
    await db.execute(sql`TRUNCATE TABLE "masterlist" CASCADE`)
    console.log('  ✅ Cleared masterlist')
    
    await db.execute(sql`TRUNCATE TABLE "classes" CASCADE`)
    console.log('  ✅ Cleared classes')
    
    await db.execute(sql`TRUNCATE TABLE "admins" CASCADE`)
    console.log('  ✅ Cleared admins')
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Database cleanup completed successfully!')
    console.log('='.repeat(80))
    console.log('\n💡 Run "bun run seed" to populate with test data again.\n')

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run cleanup
cleanup()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

