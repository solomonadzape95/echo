import { Hono } from 'hono'
import { issuanceController } from '../controllers/issuance.controller'
import { adminMiddleware } from '../middleware/admin.middleware'

const issuance = new Hono()

// Issuances map a voter to an election (participation, not choices). This is
// sensitive metadata, so only admins may list or mutate it. The RA service
// writes the marker internally; the voting flow never calls these endpoints.
issuance.use('*', adminMiddleware)

issuance.get('/', (c) => issuanceController.getAll(c))
issuance.get('/:id', (c) => issuanceController.getOne(c))
issuance.post('/', (c) => issuanceController.create(c))

export default issuance
