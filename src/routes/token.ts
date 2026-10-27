import { Hono } from 'hono'
import { tokenController } from '../controllers/token.controller'
import { adminMiddleware } from '../middleware/admin.middleware'

const token = new Hono()

// Token rows are anonymous nullifiers, but exposing or mutating them is an
// administrative/debug concern. The voting flow writes tokens internally.
token.use('*', adminMiddleware)

token.get('/', (c) => tokenController.getAll(c))
token.get('/by-election', (c) => tokenController.getByElection(c))
token.get('/unused', (c) => tokenController.getUnusedByElection(c))
token.get('/:id', (c) => tokenController.getById(c))
token.post('/', (c) => tokenController.create(c))
token.put('/:id', (c) => tokenController.update(c))
token.put('/:id/use', (c) => tokenController.markAsUsed(c))
token.delete('/:id', (c) => tokenController.delete(c))

export default token
