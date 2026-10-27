import { Hono } from 'hono'
import { chainService } from '../../services/chain.service'
import { adminMiddleware } from '../../middleware/admin.middleware'

/**
 * Admin-only view of the optional on-chain mirror.
 *
 * The contract stores only anonymous commitments, so exposing its state to an
 * administrator does not reveal a voter or a ballot choice.
 */
const chain = new Hono()

chain.use('*', adminMiddleware)

// GET /admin/chain/status?electionId=...
chain.get('/status', async (c) => {
  const electionId = c.req.query('electionId') || null
  const info = chainService.info()
  let onChain = null
  let error: string | null = null

  if (electionId && info.enabled) {
    try {
      onChain = await chainService.getElectionState(electionId)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to read the on-chain ledger'
    }
  }

  return c.json({
    success: true,
    data: { ...info, electionId, onChain, error },
  })
})

// POST /admin/chain/sync/:electionId
chain.post('/sync/:electionId', async (c) => {
  try {
    const result = await chainService.syncElection(c.req.param('electionId'))
    return c.json({ success: true, data: result, message: 'Commitments synced to the ledger' })
  } catch (cause) {
    return c.json(
      {
        success: false,
        message: cause instanceof Error ? cause.message : 'Failed to sync commitments',
      },
      400
    )
  }
})

export default chain
