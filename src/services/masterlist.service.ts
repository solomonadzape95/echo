import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { db } from '../db/db'
import { masterlist } from '../models/masterlist.schema'
import { classes } from '../models/class.schema'
import { voters } from '../models/voter.schema'

export interface StudentInput {
  name: string
  regNo: string
}

export interface UploadResult {
  total: number
  created: number
  updated: number
  unchanged: number
  skipped: number
  errors: Array<{ regNo: string; line?: number; error: string }>
}

export interface GetAllOptions {
  classId?: string
  activated?: boolean
  regNumber?: string
  search?: string
  page?: number
  limit?: number
}

export interface MasterlistEntry {
  id: string
  name: string
  regNo: string
  classId: string
  classLevel: string | null
  department: string | null
  faculty: string | null
  activated: boolean
  hasAccount: boolean
  registrationCodeHash: string | null
  createdAt: Date
  updatedAt: Date
}

interface MasterlistFilters {
  classId?: string
  activated?: boolean
  regNumber?: string
  search?: string
}

function buildFilters(options: MasterlistFilters) {
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

  if (options.search) {
    const pattern = `%${options.search.trim().toLowerCase()}%`
    conditions.push(
      or(
        sql`lower(${masterlist.name}) like ${pattern}`,
        sql`lower(${masterlist.regNo}) like ${pattern}`,
        sql`lower(${classes.level}) like ${pattern}`,
        sql`lower(${classes.department}::text) like ${pattern}`,
        sql`lower(${classes.faculty}::text) like ${pattern}`
      )
    )
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export class MasterlistService {
  /**
   * Upload masterlist entries for a class.
   *
   * Existing entries are matched on registration number, so re-uploading the
   * same file is safe: names are refreshed and nothing is duplicated.
   */
  async uploadMasterlist(classId: string, students: StudentInput[]): Promise<UploadResult> {
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
      unchanged: 0,
      skipped: 0,
      errors: [],
    }

    const normalized: StudentInput[] = []
    const seen = new Map<string, string>()

    for (const student of students) {
      const name = student.name.trim()
      const regNo = student.regNo.trim()

      if (!name || !regNo) {
        result.skipped++
        result.errors.push({ regNo, error: 'Name and registration number are required' })
        continue
      }

      const key = regNo.toLowerCase()
      const duplicate = seen.get(key)
      if (duplicate) {
        result.skipped++
        result.errors.push({
          regNo,
          error: `Duplicate registration number in this upload (first seen as "${duplicate}")`,
        })
        continue
      }

      seen.set(key, regNo)
      normalized.push({ name, regNo })
    }

    if (normalized.length === 0) {
      return result
    }

    const regNos = normalized.map((student) => student.regNo)
    const existing = await db
      .select()
      .from(masterlist)
      .where(inArray(masterlist.regNo, regNos))

    const byRegNo = new Map(existing.map((entry) => [entry.regNo.toLowerCase(), entry]))

    const conflicting = await db
      .select({
        id: masterlist.id,
        regNo: masterlist.regNo,
        classId: masterlist.class,
        classLevel: classes.level,
      })
      .from(masterlist)
      .leftJoin(classes, eq(masterlist.class, classes.id))
      .where(and(inArray(masterlist.regNo, regNos), ne(masterlist.class, classId)))

    const conflictsByRegNo = new Map(
      conflicting.map((entry) => [entry.regNo.toLowerCase(), entry])
    )

    const toInsert: StudentInput[] = []

    await db.transaction(async (tx) => {
      for (const student of normalized) {
        const key = student.regNo.toLowerCase()
        const conflict = conflictsByRegNo.get(key)

        if (conflict) {
          result.skipped++
          result.errors.push({
            regNo: student.regNo,
            error: `Already in ${conflict.classLevel ?? 'another class'}. A registration number can only belong to one class.`,
          })
          continue
        }

        const current = byRegNo.get(key)

        if (!current) {
          toInsert.push(student)
          continue
        }

        if (current.name === student.name) {
          result.unchanged++
          continue
        }

        await tx
          .update(masterlist)
          .set({ name: student.name })
          .where(eq(masterlist.id, current.id))

        result.updated++
      }

      if (toInsert.length > 0) {
        await tx.insert(masterlist).values(
          toInsert.map((student) => ({
            name: student.name,
            regNo: student.regNo,
            class: classId,
            activated: false,
          }))
        )
        result.created += toInsert.length
      }
    })

    return result
  }

  /**
   * Get masterlist entries with optional filters and pagination.
   */
  async getAll(options: GetAllOptions = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 20
    const offset = (page - 1) * limit

    const where = buildFilters(options)

    const baseQuery = db
      .select({
        id: masterlist.id,
        name: masterlist.name,
        regNo: masterlist.regNo,
        classId: masterlist.class,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
        activated: masterlist.activated,
        registrationCodeHash: masterlist.registrationCodeHash,
        createdAt: masterlist.createdAt,
        updatedAt: masterlist.updatedAt,
        voterId: voters.id,
      })
      .from(masterlist)
      .leftJoin(classes, eq(masterlist.class, classes.id))
      .leftJoin(voters, eq(voters.regNumber, masterlist.regNo))

    const rows = await (where ? baseQuery.where(where) : baseQuery)
      .orderBy(asc(masterlist.name), asc(masterlist.regNo))
      .limit(limit)
      .offset(offset)

    const countQuery = db
      .select({ total: sql<number>`count(*)` })
      .from(masterlist)
      .leftJoin(classes, eq(masterlist.class, classes.id))

    const [countRow] = await (where ? countQuery.where(where) : countQuery)

    return {
      data: rows.map((row): MasterlistEntry => ({
        id: row.id,
        name: row.name,
        regNo: row.regNo,
        classId: row.classId,
        classLevel: row.classLevel ?? null,
        department: row.department ?? null,
        faculty: row.faculty ?? null,
        activated: row.activated,
        hasAccount: !!row.voterId,
        registrationCodeHash: row.registrationCodeHash ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total: Number(countRow?.total ?? 0),
    }
  }

  async setActivation(studentId: string, activated: boolean) {
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
      .set({ activated })
      .where(eq(masterlist.id, studentId))
      .returning()

    return updated
  }

  async activateStudent(studentId: string) {
    return this.setActivation(studentId, true)
  }

  /**
   * Activate every pending entry, optionally restricted to one class.
   * Useful after importing a large masterlist.
   */
  async activateAll(classId?: string) {
    const conditions = [eq(masterlist.activated, false)]
    if (classId) conditions.push(eq(masterlist.class, classId))

    const updated = await db
      .update(masterlist)
      .set({ activated: true })
      .where(and(...conditions))
      .returning({ id: masterlist.id })

    return { activated: updated.length }
  }

  async deactivateStudent(studentId: string) {
    return this.setActivation(studentId, false)
  }

  async deleteEntry(studentId: string) {
    const [deleted] = await db
      .delete(masterlist)
      .where(eq(masterlist.id, studentId))
      .returning({ id: masterlist.id })

    if (!deleted) {
      throw new Error('Student not found in masterlist')
    }

    return deleted
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
    const [result] = await db
      .select({
        id: masterlist.id,
        regNo: masterlist.regNo,
        name: masterlist.name,
        classId: masterlist.class,
        activated: masterlist.activated,
        registrationCodeHash: masterlist.registrationCodeHash,
        createdAt: masterlist.createdAt,
        updatedAt: masterlist.updatedAt,
        voterId: voters.id,
        classLevel: classes.level,
        classId_full: classes.id,
        department: classes.department,
        faculty: classes.faculty,
      })
      .from(masterlist)
      .leftJoin(classes, eq(masterlist.class, classes.id))
      .leftJoin(voters, eq(voters.regNumber, masterlist.regNo))
      .where(eq(masterlist.regNo, regNo))
      .limit(1)

    if (!result) {
      return null
    }

    const nameParts = result.name.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    return {
      id: result.id,
      regNumber: result.regNo,
      firstName,
      lastName,
      classId: result.classId,
      activated: result.activated,
      hasAccount: !!result.voterId,
      claimRequired: !!result.registrationCodeHash,
      class: result.classId_full ? {
        id: result.classId_full,
        name: result.classLevel,
        department: result.department || undefined,
        faculty: result.faculty || undefined,
      } : undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }
  }
}

export const masterlistService = new MasterlistService()
