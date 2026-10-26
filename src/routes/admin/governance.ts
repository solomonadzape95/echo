import { Hono } from 'hono'
import { governanceController } from '../../controllers/governance.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const governance = new Hono()

// All governance routes require admin authentication.
governance.use('*', adminMiddleware)

// POST /admin/governance/proposals - propose a critical action
governance.post('/proposals', (c) => governanceController.create(c))

// GET /admin/governance/proposals?electionId= - list proposals
governance.get('/proposals', (c) => governanceController.list(c))

// GET /admin/governance/proposals/:id - proposal + signatures
governance.get('/proposals/:id', (c) => governanceController.get(c))

// POST /admin/governance/proposals/:id/approve - sign a proposal
governance.post('/proposals/:id/approve', (c) => governanceController.approve(c))

// POST /admin/governance/proposals/:id/reject - cancel a proposal
governance.post('/proposals/:id/reject', (c) => governanceController.reject(c))

export default governance
