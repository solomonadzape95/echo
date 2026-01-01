import { eq, and } from 'drizzle-orm'
import { db } from '../db/db'
import { masterlist } from '../models/masterlist.schema'
import { classes } from '../models/class.schema'

interface StudentInput {
  name: string
  regNo: string
}

interface UploadResult {
  total: number
  created: number
  updated: number
  errors: Array<{ regNo: string; error: string }>
}

interface GetAllOptions {
  classId?: string
  activated?: boolean
  regNumber?: string
}

export class MasterlistService {
  /**
   * Upload masterlist for a class
   * Creates new entries or updates existing ones based on regNo
   */
  async uploadMasterlist(classId: string, students: StudentInput[]): Promise<UploadResult> {
    // Verify class exists
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1)

    if (!classRecord) {
      throw new Error('Class not found')
    }

    const result: UploadResult = {
      total: students.length,
      created: 0,
      updated: 0,
      errors: [],
    }

    // Process each student
    for (const student of students) {
      try {
        // Check if student already exists (by regNo and class)
        const [existing] = await db
          .select()
          .from(masterlist)
          .where(
            and(
              eq(masterlist.regNo, student.regNo),
              eq(masterlist.class, classId)
            )
          )
          .limit(1)

        if (existing) {
          // Update existing entry
          await db
            .update(masterlist)
            .set({
              name: student.name,
              // Keep existing activated status unless explicitly changing
            })
            .where(eq(masterlist.id, existing.id))

          result.updated++
        } else {
          // Create new entry
          await db.insert(masterlist).values({
            name: student.name,
            regNo: student.regNo,
            class: classId,
            activated: false, // Default to not activated
          })

          result.created++
        }
      } catch (error: any) {
        result.errors.push({
          regNo: student.regNo,
          error: error.message || 'Unknown error',
        })
      }
    }

    return result
  }

  /**
   * Get all masterlist entries with optional filters
   */
  async getAll(options: GetAllOptions = {}) {
    const conditions = []

    if (options.classId) {
      conditions.push(eq(masterlist.class, options.classId))
    }

    if (options.activated !== undefined) {
      conditions.push(eq(masterlist.activated, options.activated))
    }

    if (options.regNumber) {
      conditions.push(eq(masterlist.regNo, options.regNumber))
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(masterlist)
        .where(and(...conditions))
    }

    return await db.select().from(masterlist)
  }

  /**
   * Activate a student
   */
  async activateStudent(studentId: string) {
    const [student] = await db
      .select()
      .from(masterlist)
      .where(eq(masterlist.id, studentId))
      .limit(1)

    if (!student) {
      throw new Error('Student not found in masterlist')
    }

    const [updated] = await db
      .update(masterlist)
      .set({ activated: true })
      .where(eq(masterlist.id, studentId))
      .returning()

    return updated
  }

  /**
   * Deactivate a student
   */
  async deactivateStudent(studentId: string) {
    const [student] = await db
      .select()
      .from(masterlist)
      .where(eq(masterlist.id, studentId))
      .limit(1)

    if (!student) {
      throw new Error('Student not found in masterlist')
    }

    const [updated] = await db
      .update(masterlist)
      .set({ activated: false })
      .where(eq(masterlist.id, studentId))
      .returning()

    return updated
  }

  /**
   * Get student by registration number
   */
  async getByRegNo(regNo: string) {
    const [student] = await db
      .select()
      .from(masterlist)
      .where(eq(masterlist.regNo, regNo))
      .limit(1)

    return student || null
  }

  /**
   * Get student by registration number with populated class, department, and faculty
   */
  async getByRegNoWithRelations(regNo: string) {
    try {
      console.log('[MASTERLIST SERVICE] getByRegNoWithRelations called with regNo:', regNo)
      
      const [result] = await db
        .select({
          // Masterlist fields
          id: masterlist.id,
          regNo: masterlist.regNo,
          name: masterlist.name,
          classId: masterlist.class,
          activated: masterlist.activated,
          createdAt: masterlist.createdAt,
          updatedAt: masterlist.updatedAt,
          // Class fields
          classLevel: classes.level,
          classId_full: classes.id,
          // Department and Faculty fields (now enum values directly in class)
          department: classes.department,
          faculty: classes.faculty,
        })
        .from(masterlist)
        .leftJoin(classes, eq(masterlist.class, classes.id))
        .where(eq(masterlist.regNo, regNo))
        .limit(1)

      console.log('[MASTERLIST SERVICE] Query result:', result ? 'Found' : 'Not found')

      if (!result) {
        console.log('[MASTERLIST SERVICE] No record found for regNo:', regNo)
        return null
      }

      // Transform to match frontend expectations
      const nameParts = result.name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const transformed = {
        id: result.id,
        regNumber: result.regNo,
        firstName,
        lastName,
        classId: result.classId,
        activated: result.activated,
        class: result.classId_full ? {
          id: result.classId_full,
          name: result.classLevel,
          department: result.department || undefined,
          faculty: result.faculty || undefined,
        } : undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }

      console.log('[MASTERLIST SERVICE] Transformed record:', JSON.stringify(transformed, null, 2))
      return transformed
    } catch (error: any) {
      console.error('[MASTERLIST SERVICE] Error in getByRegNoWithRelations:', error)
      console.error('[MASTERLIST SERVICE] Error stack:', error.stack)
      throw error
    }
  }
}

export const masterlistService = new MasterlistService()

