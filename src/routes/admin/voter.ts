import { Hono } from 'hono'
import { adminMiddleware } from '../../middleware/admin.middleware'
import { eq, or, sql, and } from 'drizzle-orm'
import { db } from '../../db/db'
import { voters } from '../../models/voter.schema'
import { classes } from '../../models/class.schema'
import { elections } from '../../models/election.schema'
import { masterlist } from '../../models/masterlist.schema'

const voter = new Hono()

// All admin routes require admin authentication
voter.use('*', adminMiddleware)

// GET /admin/voter - Get all voters (with optional filters)
voter.get('/', async (c) => {
  try {
    const classId = c.req.query('classId')
    
    // Build query with joins to get class details
    let query = db
      .select({
        id: voters.id,
        username: voters.username,
        regNumber: voters.regNumber,
        profilePicture: voters.profilePicture,
        classId: voters.class,
        createdAt: voters.createdAt,
        classLevel: classes.level,
        department: classes.department,
        faculty: classes.faculty,
      })
      .from(voters)
      .leftJoin(classes, eq(voters.class, classes.id))
    
    if (classId) {
      query = query.where(eq(voters.class, classId)) as any
    }
    
    const votersList = await query
    
    return c.json({
      success: true,
      data: votersList.map(v => ({
        id: v.id,
        username: v.username,
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
        // Don't return password
      })),
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