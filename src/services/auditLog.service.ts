import { desc, or, sql } from 'drizzle-orm'
import { db } from '../db/db'
import { adminAuditLogs } from '../models/auditLog.schema'

export interface AuditRecord {
  adminId?: string | null
  adminUsername?: string | null
  method: string
  path: string
  status?: number | null
  ip?: string | null
  userAgent?: string | null
}

export class AuditLogService {
  async record(record: AuditRecord) {
    try {
      await db.insert(adminAuditLogs).values({
        adminId: record.adminId ?? null,
        adminUsername: record.adminUsername ?? null,
        method: record.method.slice(0, 10),
        path: record.path.slice(0, 500),
        status: record.status ?? null,
        ip: record.ip?.slice(0, 100) ?? null,
        userAgent: record.userAgent?.slice(0, 500) ?? null,
      })
    } catch (error: any) {
      console.error('[AUDIT] Failed to write audit record:', error?.message || error)
    }
  }

  async list(options: { page: number; limit: number; search?: string }) {
    const offset = (options.page - 1) * options.limit
    const search = options.search?.trim().toLowerCase()

    const where = search
      ? or(
          sql`lower(${adminAuditLogs.adminUsername}) like ${`%${search}%`}`,
          sql`lower(${adminAuditLogs.path}) like ${`%${search}%`}`,
          sql`lower(${adminAuditLogs.method}) like ${`%${search}%`}`
        )
      : undefined

    const base = db
      .select()
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(options.limit)
      .offset(offset)

    const rows = await (where ? base.where(where) : base)

    const countQuery = db
      .select({ total: sql<number>`count(*)` })
      .from(adminAuditLogs)

    const [countRow] = await (where ? countQuery.where(where) : countQuery)

    return { data: rows, total: Number(countRow?.total ?? 0) }
  }
}

export const auditLogService = new AuditLogService()
