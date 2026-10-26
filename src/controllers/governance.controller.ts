import { Context } from 'hono'
import { governanceService } from '../services/governance.service'
import { createProposalSchema } from '../validators/governance.validator'

/**
 * Threshold multi-signature governance endpoints (admin-only).
 */
export class GovernanceController {
  /** POST /admin/governance/proposals */
  async create(c: Context) {
    try {
      const admin = c.get('admin')
      if (!admin?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const input = createProposalSchema.parse(await c.req.json())
      const proposal = await governanceService.createProposal(admin.id, input)

      return c.json(
        { success: true, data: proposal, message: 'Proposal created' },
        201
      )
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return c.json(
          { success: false, message: 'Validation error', errors: error.errors },
          400
        )
      }
      return c.json({ success: false, message: error.message || 'Failed to create proposal' }, 400)
    }
  }

  /** GET /admin/governance/proposals?electionId= */
  async list(c: Context) {
    try {
      const electionId = c.req.query('electionId') || undefined
      const proposals = await governanceService.listProposals(electionId)
      return c.json(
        { success: true, data: proposals, threshold: governanceService.threshold() },
        200
      )
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to list proposals' }, 400)
    }
  }

  /** GET /admin/governance/proposals/:id */
  async get(c: Context) {
    try {
      const proposal = await governanceService.getProposal(c.req.param('id')!)
      return c.json({ success: true, data: proposal }, 200)
    } catch (error: any) {
      const status = error.message === 'Proposal not found' ? 404 : 400
      return c.json({ success: false, message: error.message || 'Failed to fetch proposal' }, status)
    }
  }

  /** POST /admin/governance/proposals/:id/approve */
  async approve(c: Context) {
    try {
      const admin = c.get('admin')
      if (!admin?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const proposal = await governanceService.approve(admin.id, c.req.param('id')!)
      return c.json({ success: true, data: proposal, message: 'Proposal signed' }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to approve proposal' }, 400)
    }
  }

  /** POST /admin/governance/proposals/:id/reject */
  async reject(c: Context) {
    try {
      const admin = c.get('admin')
      if (!admin?.id) return c.json({ success: false, message: 'Unauthorized' }, 401)

      const proposal = await governanceService.reject(admin.id, c.req.param('id')!)
      return c.json({ success: true, data: proposal, message: 'Proposal rejected' }, 200)
    } catch (error: any) {
      return c.json({ success: false, message: error.message || 'Failed to reject proposal' }, 400)
    }
  }
}

export const governanceController = new GovernanceController()
