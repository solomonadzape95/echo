import { Hono } from 'hono'
import { adminMiddleware } from '../../middleware/admin.middleware'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { voters } from '../../models/voter.schema'

const voter = new Hono()

// All admin routes require admin authentication
voter.use('*', adminMiddleware)

// GET /admin/voter - Get all voters (with optional filters)
voter.get('/', async (c) => {
  try {
    const classId = c.req.query('classId')
    
    let query = db.select().from(voters)
    
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
        class: v.class,
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

// GET /admin/voter/:id - Get voter by ID
voter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const [voter] = await db
      .select()
      .from(voters)
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
        class: voter.class,
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