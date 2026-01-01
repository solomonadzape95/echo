/**
 * Migration script to convert departments/faculties from tables to enums
 * 
 * This script:
 * 1. Creates enum types
 * 2. Adds tokenHash to issuances
 * 3. Migrates data from UUIDs to enum values
 * 4. Updates classes table structure
 * 5. Drops old tables
 * 
 * Run with: bun run scripts/migrate-to-enums.ts
 */

import postgres from 'postgres'
import { FacultyEnum, DepartmentEnum } from '../src/types/faculty.types'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = postgres(connectionString)

async function migrate() {
  console.log('🚀 Starting migration to enums...')

  try {
    // Step 1: Create enum types
    console.log('📝 Creating enum types...')
    const facultyValues = Object.values(FacultyEnum).map(f => `'${f.replace(/'/g, "''")}'`).join(',')
    const departmentValues = Object.values(DepartmentEnum).map(d => `'${d.replace(/'/g, "''")}'`).join(',')
    
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE "public"."faculty_name" AS ENUM(${facultyValues});
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE "public"."department_name" AS ENUM(${departmentValues});
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Step 2: Add tokenHash to issuances
    console.log('📝 Adding tokenHash column to issuances...')
    await sql`
      ALTER TABLE "public"."issuances" 
      ADD COLUMN IF NOT EXISTS "token_hash" varchar(255);
    `

    // Step 3: Drop foreign key constraints
    console.log('📝 Dropping foreign key constraints...')
    await sql`
      ALTER TABLE "public"."classes" 
      DROP CONSTRAINT IF EXISTS "classes_faculty_faculties_id_fk",
      DROP CONSTRAINT IF EXISTS "classes_department_departments_id_fk";
    `

    // Step 4: Create temporary enum columns
    console.log('📝 Creating temporary enum columns...')
    await sql`
      ALTER TABLE "public"."classes"
      ADD COLUMN IF NOT EXISTS "faculty_enum" "public"."faculty_name",
      ADD COLUMN IF NOT EXISTS "department_enum" "public"."department_name";
    `

    // Step 5: Migrate data (map UUIDs to enum values)
    console.log('📝 Migrating data from UUIDs to enums...')
    // Get all faculty mappings
    const faculties = await sql`
      SELECT id, name FROM "public"."faculties"
    `
    const facultyMap = new Map(faculties.map(f => [f.id, f.name]))

    // Get all department mappings
    const departments = await sql`
      SELECT id, name, faculty FROM "public"."departments"
    `
    const departmentMap = new Map(departments.map(d => [d.id, d.name]))

    // Update classes with enum values
    const classes = await sql`
      SELECT id, faculty, department FROM "public"."classes"
    `

    for (const cls of classes) {
      const facultyName = facultyMap.get(cls.faculty)
      const departmentName = departmentMap.get(cls.department)

      if (facultyName && departmentName) {
        await sql`
          UPDATE "public"."classes"
          SET 
            faculty_enum = ${facultyName}::"public"."faculty_name",
            department_enum = ${departmentName}::"public"."department_name"
          WHERE id = ${cls.id}
        `
      } else {
        console.warn(`⚠️  Could not map class ${cls.id}: faculty=${facultyName}, department=${departmentName}`)
      }
    }

    // Step 6: Drop old columns and rename
    console.log('📝 Updating column structure...')
    await sql`
      ALTER TABLE "public"."classes"
      DROP COLUMN IF EXISTS "faculty",
      DROP COLUMN IF EXISTS "department";
    `

    await sql`
      ALTER TABLE "public"."classes"
      RENAME COLUMN "faculty_enum" TO "faculty";
    `

    await sql`
      ALTER TABLE "public"."classes"
      RENAME COLUMN "department_enum" TO "department";
    `

    // Step 7: Make columns NOT NULL
    await sql`
      ALTER TABLE "public"."classes"
      ALTER COLUMN "faculty" SET NOT NULL,
      ALTER COLUMN "department" SET NOT NULL;
    `

    // Step 8: Drop old tables
    console.log('📝 Dropping old tables...')
    await sql`DROP TABLE IF EXISTS "public"."departments" CASCADE;`
    await sql`DROP TABLE IF EXISTS "public"."faculties" CASCADE;`

    console.log('✅ Migration completed successfully!')
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

migrate().catch(console.error)

