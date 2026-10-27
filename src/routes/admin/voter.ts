import { Hono } from 'hono'
import { z } from 'zod'
import crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { adminMiddleware } from '../../middleware/admin.middleware'
import { eq, or, sql, and, desc } from 'drizzle-orm'
import { db } from '../../db/db'
import { voters } from '../../models/voter.schema'
import { classes } from '../../models/class.schema'
import { elections } from '../../models/election.schema'
import { masterlist } from '../../models/masterlist.schema'
import { deviceBindingService } from '../../services/deviceBinding.service'
import { refreshTokenService } from '../../services/refreshToken.service'
import {
  buildPaginationMeta,
  parsePagination,
} from '../../helpers/pagination.helpers'

const voter = new Hono()

// All admin routes require admin authentication
voter.use('*', adminMiddleware)

// GET /admin/voter?page=&limit=&search=&classId=
//
// Server-side pagination matters here: the register can hold thousands of
// voters, so loading the whole table into the browser just to slice it is not
// acceptable.
voter.get('/', async (c) => {
  try {
    const classId = c.req.query('classId')
    const search = c.req.query('search')?.trim()
    const { page, limit, offset } = parsePagination({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    })

    const conditions = []

    if (classId) {
      conditions.push(eq(voters.class, classId))
    }

    if (search) {
      const pattern = `%${search.toLowerCase()}%`
      conditions.push(
        or(
          sql`lower(${voters.username}) like ${pattern}`,
          sql`lower(${voters.regNumber}) like ${pattern}`,
          sql`lower(${masterlist.name}) like ${pattern}`,
          sql`lower(${classes.level}) like ${pattern}`,
          sql`lower(${classes.department}::text) like ${pattern}`,
          sql`lower(${classes.faculty}::text) like ${pattern}`
        )
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const baseQuery = db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        profilePicture: voters.profilePicture,
        classId: voters.class,
        createdAt: voters.createdAt,
        disabled: voters.disabled,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
        masterlistName: masterlist.name,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .leftJoin(masterlist, eq(voters.regNumber, masterlist.regNo))

    const votersList = await (where ? baseQuery.where(where) : baseQuery)
      .orderBy(desc(voters.createdAt))
      .limit(limit)
      .offset(offset)

    const countQuery = db
      .select({ total: sql<number>`count(*)` })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .leftJoin(masterlist, eq(voters.regNumber, masterlist.regNo))

    const [countRow] = await (where ? countQuery.where(where) : countQuery)
    const total = Number(countRow?.total ?? 0)

    return c.json({
      success: true,
      data: votersList.map(v => ({
        id: v.id,
        username: v.username,
        name: v.masterlistName || v.username,
        regNumber: v.regNumber,
        profilePicture: v.profilePicture || null,
        class: v.classLevel || v.classId || null, // Use class level name, fallback to ID
        classId: v.classId,
        classDetails: v.classLevel ? {
          level: v.classLevel,
          department: v.department,
          faculty: v.faculty,
        } : null,
        createdAt: v.createdAt,
        disabled: v.disabled,
        // Don't return password
      })),
      pagination: buildPaginationMeta(total, page, limit),
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to fetch voters',
    }, 500)
  }
})

// GET /admin/voter/search - Search voters by election domain
// Query params: electionId (required), query (required, min 3 chars)
voter.get('/search', async (c) => {
  try {
    const electionId = c.req.query('electionId')
    const searchQuery = c.req.query('query')

    if (!electionId) {
      return c.json({
        success: false,
        message: 'electionId query parameter is required',
      }, 400)
    }

    if (!searchQuery || searchQuery.length < 3) {
      return c.json({
        success: false,
        message: 'query parameter is required and must be at least 3 characters',
      }, 400)
    }

    // Get election to determine domain filter
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) {
      return c.json({
        success: false,
        message: 'Election not found',
      }, 404)
    }

    // Build domain filter based on election type
    let domainFilter: any = null
    switch (election.type) {
      case 'class':
        // Filter by class ID
        domainFilter = eq(voters.class, election.domainId)
        break
      case 'department':
        // Filter by department enum
        domainFilter = eq(classes.department, election.domainId)
        break
      case 'faculty':
        // Filter by faculty enum
        domainFilter = eq(classes.faculty, election.domainId)
        break
      default:
        return c.json({
          success: false,
          message: 'Invalid election type',
        }, 400)
    }

    // Search voters by name (from masterlist) or registration number
    // Join with masterlist to get names and classes to filter by domain
    // Use case-insensitive search with ilike (PostgreSQL) or convert to lowercase
    const searchPattern = `%${searchQuery.toLowerCase()}%`
    const results = await db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        profilePicture: voters.profilePicture,
        name: masterlist.name,
        class: voters.class,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .leftJoin(masterlist, eq(voters.regNumber, masterlist.regNo))
      .where(
        and(
          domainFilter,
          or(
            sql`LOWER(${masterlist.name}) LIKE ${searchPattern}`,
            sql`LOWER(${voters.regNumber}) LIKE ${searchPattern}`,
            sql`LOWER(${voters.username}) LIKE ${searchPattern}`
          )
        )
      )
      .limit(20) // Limit results to 20

    return c.json({
      success: true,
      data: results.map(v => ({
        id: v.id,
        username: v.username,
        regNumber: v.regNumber,
        profilePicture: v.profilePicture || null,
        name: v.name || v.username,
        class: v.class,
        classLevel: v.classLevel,
        department: v.department,
        faculty: v.faculty,
      })),
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to search voters',
    }, 500)
  }
})

// GET /admin/voter/:id/device - Inspect the device lock for a voter
voter.get('/:id/device', async (c) => {
  try {
    const voterId = c.req.param('id')
    const binding = await deviceBindingService.getForVoter(voterId)

    return c.json({
      success: true,
      data: binding
        ? {
            bound: true,
            platform: binding.platform,
            boundAt: binding.boundAt,
            lastSeenAt: binding.lastSeenAt,
          }
        : { bound: false },
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to read device lock',
    }, 500)
  }
})

// DELETE /admin/voter/:id/device - Release a voter's device lock.
// Also revokes live refresh tokens so the old phone is signed out immediately.
voter.delete('/:id/device', async (c) => {
  try {
    const voterId = c.req.param('id')
    const removed = await deviceBindingService.reset(voterId)
    await refreshTokenService.revokeAllTokens(voterId, false)

    return c.json({
      success: true,
      message: removed
        ? 'Device lock reset. The voter can sign in on a new device.'
        : 'No device lock was set for this voter.',
      data: { removed },
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to reset device lock',
    }, 500)
  }
})

// POST /admin/voter/provision - Create a voter account from a masterlist entry
// Used to onboard a candidate who has not registered yet.
voter.post('/provision', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = z
      .object({
        masterlistId: z.string().uuid(),
        electionId: z.string().uuid().optional(),
        password: z.string().min(8).max(128).optional(),
      })
      .safeParse(body)

    if (!parsed.success) {
      return c.json({
        success: false,
        message: 'A valid masterlist entry is required',
      }, 400)
    }

    const [entry] = await db
      .select({
        id: masterlist.id,
        name: masterlist.name,
        regNo: masterlist.regNo,
        classId: masterlist.class,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
      })
      .from(masterlist)
      .leftJoin(classes, eq(masterlist.class, classes.id))
      .where(eq(masterlist.id, parsed.data.masterlistId))
      .limit(1)

    if (!entry) {
      return c.json({ success: false, message: 'Masterlist entry not found' }, 404)
    }

    if (parsed.data.electionId) {
      const [election] = await db
        .select()
        .from(elections)
        .where(eq(elections.id, parsed.data.electionId))
        .limit(1)

      if (!election) {
        return c.json({ success: false, message: 'Election not found' }, 404)
      }

      const eligible =
        (election.type === 'class' && election.domainId === entry.classId) ||
        (election.type === 'department' && election.domainId === entry.department) ||
        (election.type === 'faculty' && election.domainId === entry.faculty)

      if (!eligible) {
        return c.json({
          success: false,
          message: 'This student is not eligible for the selected election',
        }, 400)
      }
    }

    const [existing] = await db
      .select()
      .from(voters)
      .where(eq(voters.regNumber, entry.regNo))
      .limit(1)

    if (existing) {
      return c.json({
        success: true,
        data: {
          created: false,
          temporaryPassword: undefined,
          voter: {
            id: existing.id,
            username: existing.username,
            name: entry.name,
            regNumber: existing.regNumber,
            class: entry.classLevel || existing.class,
            classId: existing.class,
            classLevel: entry.classLevel,
            department: entry.department,
            faculty: entry.faculty,
            profilePicture: existing.profilePicture || null,
          },
        },
        message: 'An account already exists for this registration number',
      }, 200)
    }

    const generated = !parsed.data.password
    const temporaryPassword = parsed.data.password || crypto.randomBytes(9).toString('base64url')
    const password = await bcrypt.hash(temporaryPassword, 10)

    let username = entry.name
    const [nameTaken] = await db
      .select({ id: voters.id })
      .from(voters)
      .where(eq(voters.username, username))
      .limit(1)
    if (nameTaken) username = `${entry.name} (${entry.regNo})`

    const [created] = await db
      .insert(voters)
      .values({
        username,
        regNumber: entry.regNo,
        class: entry.classId,
        password,
      })
      .returning()

    if (!created) {
      return c.json({ success: false, message: 'Failed to create account' }, 500)
    }

    return c.json({
      success: true,
      data: {
        created: true,
        temporaryPassword: generated ? temporaryPassword : undefined,
        voter: {
          id: created.id,
          username: created.username,
          name: entry.name,
          regNumber: created.regNumber,
          class: entry.classLevel || created.class,
          classId: created.class,
          classLevel: entry.classLevel,
          department: entry.department,
          faculty: entry.faculty,
          profilePicture: created.profilePicture || null,
        },
      },
      message: generated
        ? 'Account created. Share the temporary password with the candidate.'
        : 'Account created.',
    }, 201)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to provision voter account',
    }, 500)
  }
})

// PATCH /admin/voter/:id - Enable or disable an account
voter.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const parsed = z.object({ disabled: z.boolean() }).safeParse(await c.req.json())

    if (!parsed.success) {
      return c.json({ success: false, message: 'A boolean disabled value is required' }, 400)
    }

    const [updated] = await db
      .update(voters)
      .set({ disabled: parsed.data.disabled })
      .where(eq(voters.id, id))
      .returning({ id: voters.id, disabled: voters.disabled })

    if (!updated) {
      return c.json({ success: false, message: 'Voter not found' }, 404)
    }

    if (updated.disabled) {
      await refreshTokenService.revokeAllTokens(id, false)
    }

    return c.json({
      success: true,
      data: updated,
      message: updated.disabled ? 'Voter account disabled' : 'Voter account enabled',
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to update voter account',
    }, 500)
  }
})

// POST /admin/voter/:id/reset-password - Generate or set a temporary password
voter.post('/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const parsed = z
      .object({ password: z.string().min(8).max(128).optional() })
      .safeParse(body)

    if (!parsed.success) {
      return c.json({
        success: false,
        message: 'Password must be between 8 and 128 characters',
      }, 400)
    }

    const [existing] = await db
      .select({ id: voters.id })
      .from(voters)
      .where(eq(voters.id, id))
      .limit(1)

    if (!existing) {
      return c.json({ success: false, message: 'Voter not found' }, 404)
    }

    const generated = !parsed.data.password
    const temporaryPassword = parsed.data.password || crypto.randomBytes(9).toString('base64url')
    const password = await bcrypt.hash(temporaryPassword, 10)

    await db.update(voters).set({ password }).where(eq(voters.id, id))
    await refreshTokenService.revokeAllTokens(id, false)

    return c.json({
      success: true,
      data: {
        generated,
        temporaryPassword: generated ? temporaryPassword : undefined,
      },
      message: generated
        ? 'Temporary password generated. Share it with the voter.'
        : 'Password updated and existing sessions revoked.',
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to reset password',
    }, 500)
  }
})

// DELETE /admin/voter/:id - Remove an account that has no voting/candidate history
voter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const [issuance] = await db.execute(sql`
      SELECT count(*)::int AS count FROM issuances WHERE voter = ${id}
    `).then((result: any) => result.rows ?? [])
    const [candidate] = await db.execute(sql`
      SELECT count(*)::int AS count FROM candidates WHERE voter = ${id}
    `).then((result: any) => result.rows ?? [])

    if (Number(issuance?.count ?? 0) > 0 || Number(candidate?.count ?? 0) > 0) {
      return c.json({
        success: false,
        message:
          'This account has voting or candidate history and cannot be deleted. Disable it instead.',
      }, 409)
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM refresh_tokens WHERE voter_id = ${id}`)
      await tx.execute(sql`DELETE FROM password_reset_tokens WHERE voter_id = ${id}`)
      await tx.execute(sql`DELETE FROM webauthn_challenges WHERE voter_id = ${id}`)
      await tx.execute(sql`DELETE FROM webauthn_credentials WHERE voter_id = ${id}`)
      await tx.execute(sql`DELETE FROM device_bindings WHERE voter_id = ${id}`)
      await tx.execute(sql`DELETE FROM voters WHERE id = ${id}`)
    })

    return c.json({ success: true, message: 'Voter account deleted' }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to delete voter account',
    }, 500)
  }
})

// GET /admin/voter/export?search=&classId= - CSV of the filtered voter register
voter.get('/export', async (c) => {
  try {
    const classId = c.req.query('classId')
    const search = c.req.query('search')?.trim()
    const conditions = []

    if (classId) conditions.push(eq(voters.class, classId))

    if (search) {
      const pattern = `%${search.toLowerCase()}%`
      conditions.push(
        or(
          sql`lower(${voters.username}) like ${pattern}`,
          sql`lower(${voters.regNumber}) like ${pattern}`,
          sql`lower(${classes.level}) like ${pattern}`,
          sql`lower(${classes.department}::text) like ${pattern}`,
          sql`lower(${classes.faculty}::text) like ${pattern}`
        )
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const base = db
      .select({
        username: voters.username,
        regNumber: voters.regNumber,
        level: classes.level,
        department: classes.department,
        faculty: classes.faculty,
        disabled: voters.disabled,
        createdAt: voters.createdAt,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))

    const rows = await (where ? base.where(where) : base).orderBy(
      desc(voters.createdAt)
    )

    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value)
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const csv = [
      ['Name', 'Registration Number', 'Level', 'Department', 'Faculty', 'Status', 'Registered'],
      ...rows.map((row) => [
        row.username,
        row.regNumber,
        row.level ?? '',
        row.department ?? '',
        row.faculty ?? '',
        row.disabled ? 'Disabled' : 'Active',
        row.createdAt.toISOString(),
      ]),
    ]
      .map((row) => row.map(escape).join(','))
      .join('\r\n')

    return c.body(`\uFEFF${csv}`, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="voters-${new Date().toISOString().slice(0, 10)}.csv"`,
    })
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to export voters',
    }, 500)
  }
})

// GET /admin/voter/:id - Get voter by ID
voter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const [voter] = await db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        profilePicture: voters.profilePicture,
        classId: voters.class,
        createdAt: voters.createdAt,
        disabled: voters.disabled,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
      .where(eq(voters.id, id))
      .limit(1)
    
    if (!voter) {
      return c.json({
        success: false,
        message: 'Voter not found',
      }, 404)
    }
    
    return c.json({
      success: true,
      data: {
        id: voter.id,
        username: voter.username,
        regNumber: voter.regNumber,
        profilePicture: voter.profilePicture || null,
        class: voter.classLevel || voter.classId || null, // Use class level name, fallback to ID
        classId: voter.classId,
        classDetails: voter.classLevel ? {
          level: voter.classLevel,
          department: voter.department,
          faculty: voter.faculty,
        } : null,
        createdAt: voter.createdAt,
        disabled: voter.disabled,
        // Don't return password
      },
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to fetch voter',
    }, 500)
  }
})

export default voter