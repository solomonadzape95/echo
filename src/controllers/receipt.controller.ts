import { Context } from 'hono'
import { receiptService } from '../services/receipt.service'
import { createReceiptSchema } from '../validators/receipt.validator'

export class ReceiptController {
  /**
   * Create a new receipt
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createReceiptSchema.parse(body)

      const receipt = await receiptService.create(validatedData)

      return c.json({
        success: true,
        data: receipt,
        message: 'Receipt created successfully',
      }, 201)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        }, 400)
      }

      return c.json({
        success: false,
        message: error.message || 'Failed to create receipt',
      }, 400)
    }
  }

  /**
   * Get all receipts
   */
  async getAll(c: Context) {
    try {
      const receipts = await receiptService.getAll()

      return c.json({
        success: true,
        data: receipts,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch receipts',
      }, 500)
    }
  }

  /**
   * Get receipt by code with vote and election details (public endpoint for verification)
   * GET /receipt?code=xxx
   */
  async getByCode(c: Context) {
    try {
      const code = c.req.query('code')

      if (!code) {
        return c.json({
          success: false,
          message: 'code query parameter is required',
        }, 400)
      }

      const receiptData = await receiptService.getByCodeWithDetails(code)

      if (!receiptData) {
        return c.json({
          success: false,
          message: 'Receipt not found',
        }, 404)
      }

      return c.json({
        success: true,
        data: receiptData,
      }, 200)
    } catch (error: any) {
      console.error('[RECEIPT CONTROLLER] Error:', error)
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch receipt',
      }, 500)
    }
  }
}

export const receiptController = new ReceiptController()

