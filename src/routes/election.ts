import { Hono } from 'hono'
import { electionController } from '../controllers/election.controller'
import { resultController } from '../controllers/result.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { optionalAuthMiddleware } from '../middleware/optionalAuth.middleware'

const election = new Hono()

// GET /election - Get all elections (public, but filters by domain if authenticated)
election.get('/', optionalAuthMiddleware, (c) => electionController.getAll(c))

// GET /election/active - Get active elections (public)
election.get('/active', (c) => electionController.getActive(c))

// GET /election?type=xxx - Get elections by type (public)
election.get('/by-type', (c) => electionController.getByType(c))

// GET /election?status=xxx - Get elections by status (public)
election.get('/by-status', (c) => electionController.getByStatus(c))

// GET /election?domainId=xxx - Get elections by domain (public)
election.get('/by-domain', (c) => electionController.getByDomain(c))

// GET /election/:id/results/status - Check if results have been calculated (public)
// Must come before /:id/results to avoid route conflicts
election.get('/:id/results/status', (c) => resultController.checkResultsStatus(c))

// GET /election/:id/results - Get election results (public - after election ends)
// Must come before /:id to avoid route conflicts
election.get('/:id/results', (c) => resultController.getResults(c))

// GET /election/:id - Get election by ID (public)
election.get('/:id', (c) => electionController.getById(c))

// POST /election - Create new election (requires auth)
election.post('/', authMiddleware, (c) => electionController.create(c))

// PUT /election/:id - Update election (requires auth)
election.put('/:id', authMiddleware, (c) => electionController.update(c))

// DELETE /election/:id - Delete election (requires auth)
election.delete('/:id', authMiddleware, (c) => electionController.delete(c))

export default election