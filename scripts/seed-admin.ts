#!/usr/bin/env bun

/**
 * Admin Seeding Script
 * 
 * This script creates a default admin account.
 * 
 * Usage:
 *   bun run scripts/seed-admin.ts
 * 
 * Environment Variables:
 *   ADMIN_USERNAME - Admin username (default: 'admin')
 *   ADMIN_EMAIL - Admin email (default: 'admin@example.com')
 *   ADMIN_PASSWORD - Admin password (default: 'admin123')
 *   ADMIN_ROLE - Admin role: 'super_admin', 'admin', or 'moderator' (default: 'super_admin')
 *   ADMIN_FULL_NAME - Admin full name (optional)
 */

import { db } from '../src/db/db'
import { admins } from '../src/models/admin.schema'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'

async function seedAdmin() {
  console.log('👤 Starting admin seeding...\n')

  // Get admin credentials from environment or use defaults
  const username = process.env.ADMIN_USERNAME || 'admin'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const role = (process.env.ADMIN_ROLE as 'super_admin' | 'admin' | 'moderator') || 'super_admin'
  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator'

  try {
    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1)

    if (existing) {
      console.log(`⚠️  Admin with username "${username}" already exists`)
      console.log('   Updating password and details...\n')
      
      // Update existing admin
      const hashedPassword = await bcrypt.hash(password, 10)
      const [updated] = await db
        .update(admins)
        .set({
          email,
          password: hashedPassword,
          role,
          fullName,
        })
        .where(eq(admins.id, existing.id))
        .returning()

      if (updated) {
        console.log('✅ Admin updated successfully!\n')
        console.log('📋 Admin Credentials:')
        console.log(`   Username: ${updated.username}`)
        console.log(`   Email: ${updated.email}`)
        console.log(`   Role: ${updated.role}`)
        console.log(`   Full Name: ${updated.fullName || 'N/A'}`)
        console.log(`   Password: ${password}\n`)
        console.log('⚠️  Note: Password has been updated to the provided/default value')
      }
    } else {
      // Create new admin
      console.log('📝 Creating new admin account...\n')
      
      const hashedPassword = await bcrypt.hash(password, 10)
      const [newAdmin] = await db
        .insert(admins)
        .values({
          username,
          email,
          password: hashedPassword,
          role,
          fullName,
        })
        .returning()

      if (newAdmin) {
        console.log('✅ Admin created successfully!\n')
        console.log('📋 Admin Credentials:')
        console.log(`   Username: ${newAdmin.username}`)
        console.log(`   Email: ${newAdmin.email}`)
        console.log(`   Role: ${newAdmin.role}`)
        console.log(`   Full Name: ${newAdmin.fullName || 'N/A'}`)
        console.log(`   Password: ${password}\n`)
        console.log('🔑 You can now login at: POST /admin/auth/login')
        console.log('   Body: { "username": "' + username + '", "password": "' + password + '" }\n')
      }
    }

    console.log('='.repeat(80))
    console.log('✨ Done!')
    console.log('='.repeat(80))
  } catch (error: any) {
    console.error('❌ Error seeding admin:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run seed
seedAdmin()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

