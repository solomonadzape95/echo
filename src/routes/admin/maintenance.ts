import { Hono } from 'hono'
import { z } from 'zod'
import { adminMiddleware } from '../../middleware/admin.middleware'
import { maintenanceService } from '../../services/maintenance.service'
import type { ResetScope } from '../../services/maintenance.service'

const maintenance = new Hono()

maintenance.use('*', adminMiddleware)

const resetSchema = z.object({
  scopes: z.array(z.enum(['voting', 'voters', 'masterlist', 'elections', 'classes'])).min(1),
  confirm: z.literal('RESET', {
    message: 'Type RESET to confirm this destructive action',
  }),
})

function resetIsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_ADMIN_RESET === 'true'
}

/**
 * GET /admin/maintenance/summary
 * Row counts for the data console, plus whether reset is permitted here.
 */
maintenance.get('/summary', async (c) => {
  try {
    const admin = (c as any).get('admin') as { role?: string } | undefined
    const summary = await maintenanceService.getSummary()

    return c.json({
      success: true,
      data: {
        ...summary,
        resetEnabled: resetIsEnabled(),
        isSuperAdmin: admin?.role === 'super_admin',
      },
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to load data summary',
    }, 500)
  }
})

/**
 * POST /admin/maintenance/reset
 *
 * Super-admin only. Disabled in production unless ALLOW_ADMIN_RESET=true.
 */
maintenance.post('/reset', async (c) => {
  try {
    if (!resetIsEnabled()) {
      return c.json({
        success: false,
        message: 'Data reset is disabled in this environment. Set ALLOW_ADMIN_RESET=true to enable it.',
      }, 403)
    }

    const admin = (c as any).get('admin') as { role?: string; username?: string } | undefined

    if (admin?.role !== 'super_admin') {
      return c.json({
        success: false,
        message: 'Only a super admin can reset data.',
      }, 403)
    }

    const body = await c.req.json()
    const parsed = resetSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid reset request',
        errors: parsed.error.issues,
      }, 400)
    }

    const result = await maintenanceService.reset(parsed.data.scopes as ResetScope[])

    console.warn(
      `[ADMIN RESET] ${admin.username ?? 'unknown'} cleared ${result.totalDeleted} rows for scopes: ${parsed.data.scopes.join(', ')}`
    )

    return c.json({
      success: true,
      data: result,
      message: `Data reset complete. ${result.totalDeleted} rows removed.`,
    }, 200)
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message || 'Failed to reset data',
    }, 500)
  }
})

export default maintenance
