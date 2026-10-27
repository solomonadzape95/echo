import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { notificationService } from '../services/notification.service'
import {
  buildPaginationMeta,
  parsePagination,
} from '../helpers/pagination.helpers'

const notifications = new Hono()

notifications.use('*', authMiddleware)

// GET /notifications?page=&limit=
notifications.get('/', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

    const { page, limit } = parsePagination({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    })

    const result = await notificationService.listForVoter(user.id, page, limit)

    return c.json({
      success: true,
      data: result.data,
      unread: result.unread,
      pagination: buildPaginationMeta(result.total, page, limit),
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to load notifications',
    }, 500)
  }
})

// GET /notifications/unread-count
notifications.get('/unread-count', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

    const unread = await notificationService.unreadCount(user.id)
    return c.json({ success: true, data: { unread } }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to count notifications',
    }, 500)
  }
})

// PUT /notifications/read-all
notifications.put('/read-all', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

    const count = await notificationService.markAllRead(user.id)
    return c.json({ success: true, data: { marked: count } }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to mark notifications read',
    }, 500)
  }
})

// PUT /notifications/:id/read
notifications.put('/:id/read', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

    const ok = await notificationService.markRead(user.id, c.req.param('id'))
    if (!ok) {
      return c.json({ success: false, message: 'Notification not found' }, 404)
    }

    return c.json({ success: true }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to mark notification read',
    }, 500)
  }
})

export default notifications
