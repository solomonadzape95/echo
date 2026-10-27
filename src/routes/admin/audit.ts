import { Hono } from 'hono'
import { adminMiddleware } from '../../middleware/admin.middleware'
import { auditLogService } from '../../services/auditLog.service'
import {
  buildPaginationMeta,
  parsePagination,
} from '../../helpers/pagination.helpers'

const audit = new Hono()

audit.use('*', adminMiddleware)

// GET /admin/audit?page=&limit=&search=
audit.get('/', async (c) => {
  try {
    const { page, limit } = parsePagination({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    })

    const result = await auditLogService.list({
      page,
      limit,
      search: c.req.query('search') || undefined,
    })

    return c.json({
      success: true,
      data: result.data,
      pagination: buildPaginationMeta(result.total, page, limit),
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to load audit log',
    }, 500)
  }
})

export default audit
