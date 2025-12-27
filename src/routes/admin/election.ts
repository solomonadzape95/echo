import { Hono } from 'hono'
import { electionController } from '../../controllers/election.controller'
import { resultController } from '../../controllers/result.controller'
import { adminMiddleware } from '../../middleware/admin.middleware'

const election = new Hono()

// All admin routes require admin authentication
election.use('*', adminMiddleware)

// GET /admin/election - Get all elections
election.get('/', (c) => electionController.getAll(c))

// GET /admin/election/active - Get active elections
election.get('/active', (c) => electionController.getActive(c))

// GET /admin/election/by-type - Get elections by type
election.get('/by-type', (c) => electionController.getByType(c))

// GET /admin/election/by-status - Get elections by status
election.get('/by-status', (c) => electionController.getByStatus(c))

// GET /admin/election/by-domain - Get elections by domain
election.get('/by-domain', (c) => electionController.getByDomain(c))

// GET /admin/election/:id - Get election by ID
election.get('/:id', (c) => electionController.getById(c))

// POST /admin/election - Create new election
election.post('/', (c) => electionController.create(c))

// PUT /admin/election/:id - Update election
election.put('/:id', (c) => electionController.update(c))

// DELETE /admin/election/:id - Delete election
election.delete('/:id', (c) => electionController.delete(c))

// POST /admin/election/:id/calculate-results - Calculate and store election results
election.post('/:id/calculate-results', (c) => resultController.calculateResults(c))

export default election