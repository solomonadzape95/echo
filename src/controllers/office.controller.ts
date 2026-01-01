import { Context } from 'hono'
import { officeService } from '../services/office.service'
import { createOfficeSchema, updateOfficeSchema, officeIdSchema, getOfficesByElectionSchema } from '../validators/office.validator'

export class OfficeController {
  /**
   * Create a new office
   */
  async create(c: Context) {
    let body: any = null
    try {
      console.log('[OFFICE CONTROLLER] Create request received')
      console.log('[OFFICE CONTROLLER] Content-Type:', c.req.header('Content-Type'))
      console.log('[OFFICE CONTROLLER] Raw request method:', c.req.method)
      
      try {
        body = await c.req.json()
        console.log('[OFFICE CONTROLLER] JSON parsed successfully')
      } catch (jsonError: any) {
        console.error('[OFFICE CONTROLLER] JSON parsing failed:', jsonError.message)
        console.error('[OFFICE CONTROLLER] JSON error stack:', jsonError.stack)
        return c.json({
          success: false,
          message: 'Invalid JSON in request body',
          error: jsonError.message,
        }, 400)
      }

      console.log('[OFFICE CONTROLLER] Request body:', JSON.stringify(body, null, 2))
      console.log('[OFFICE CONTROLLER] Body type:', typeof body)
      console.log('[OFFICE CONTROLLER] Body keys:', Object.keys(body || {}))
      
      // Log each field individually
      if (body) {
        console.log('[OFFICE CONTROLLER] Field details:')
        Object.keys(body).forEach(key => {
          console.log(`  - ${key}:`, body[key], `(type: ${typeof body[key]})`)
        })
      }

      const validatedData = createOfficeSchema.parse(body)
      console.log('[OFFICE CONTROLLER] Validation passed')
      console.log('[OFFICE CONTROLLER] Validated data:', JSON.stringify(validatedData, null, 2))

      const office = await officeService.create(validatedData)

      return c.json({
        success: true,
        data: office,
        message: 'Office created successfully',
      }, 201)
    } catch (error: any) {
      if (error.name === 'ZodError' || error.issues) {
        console.error('[OFFICE CONTROLLER] Validation error occurred')
        console.error('[OFFICE CONTROLLER] Error name:', error.name)
        console.error('[OFFICE CONTROLLER] Error object keys:', Object.keys(error))
        
        // Zod errors can have either 'errors' or 'issues' property
        const zodErrors = error.errors || error.issues || []
        console.error('[OFFICE CONTROLLER] Number of errors:', zodErrors.length)
        
        // Log each validation error in detail
        if (zodErrors && Array.isArray(zodErrors) && zodErrors.length > 0) {
          zodErrors.forEach((err: any, index: number) => {
            console.error(`[OFFICE CONTROLLER] Validation error ${index + 1}:`)
            console.error(`  - Path: ${err.path?.join('.') || 'unknown'}`)
            console.error(`  - Field: ${err.path?.[err.path.length - 1] || 'unknown'}`)
            console.error(`  - Message: ${err.message}`)
            console.error(`  - Code: ${err.code}`)
            if (body && err.path && err.path.length > 0) {
              const fieldValue = err.path.reduce((obj: any, key: string) => obj?.[key], body)
              console.error(`  - Received value:`, fieldValue)
              console.error(`  - Received type:`, typeof fieldValue)
            } else {
              console.error(`  - Received value: unknown (body not available)`)
            }
          })
        } else {
          console.error('[OFFICE CONTROLLER] No error details found in ZodError')
          console.error('[OFFICE CONTROLLER] Full error object:', JSON.stringify(error, null, 2))
        }

        // Format errors for better readability
        const formattedErrors = zodErrors.map((err: any) => {
          let receivedValue = null
          if (body && err.path && err.path.length > 0) {
            receivedValue = err.path.reduce((obj: any, key: string) => obj?.[key], body)
          }
          return {
            field: err.path?.join('.') || 'unknown',
            message: err.message,
            code: err.code,
            received: receivedValue,
          }
        })

        return c.json({
          success: false,
          message: 'Validation error',
          errors: formattedErrors,
          rawErrors: zodErrors, // Include raw errors for debugging
        }, 400)
      }

      console.error('[OFFICE CONTROLLER] Non-validation error:', error.message)
      console.error('[OFFICE CONTROLLER] Error stack:', error.stack)

      return c.json({
        success: false,
        message: error.message || 'Failed to create office',
      }, 400)
    }
  }

  /**
   * Get all offices
   */
  async getAll(c: Context) {
    try {
      const offices = await officeService.getAll()

      return c.json({
        success: true,
        data: offices,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch offices',
      }, 500)
    }
  }

  /**
   * Get office by ID
   */
  async getById(c: Context) {
    try {
      const identifier = c.req.param('id')
      
      // Try to get by slug first (if it's not a UUID), then by ID
      let office
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
      
      if (isUuid) {
        const validatedId = officeIdSchema.parse({ id: identifier })
        office = await officeService.getById(validatedId.id)
      } else {
        office = await officeService.getBySlug(identifier)
      }

      return c.json({
        success: true,
        data: office,
      }, 200)
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
        message: error.message || 'Failed to fetch office',
      }, error.message === 'Office not found' ? 404 : 500)
    }
  }

  /**
   * Get offices by election
   */
  async getByElection(c: Context) {
    try {
      // Support both 'election' and 'electionId' for backward compatibility
      const election = c.req.query('election') || c.req.query('electionId')
      
      if (!election) {
        return c.json({
          success: false,
          message: 'election or electionId query parameter is required',
        }, 400)
      }

      // Validate the election ID format
      const validation = getOfficesByElectionSchema.safeParse({ election })
      if (!validation.success) {
        return c.json({
          success: false,
          message: 'Invalid election ID format',
          errors: validation.error.issues || [],
        }, 400)
      }

      const offices = await officeService.getByElection(election as string)

      return c.json({
        success: true,
        data: offices,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch offices',
      }, 500)
    }
  }

  /**
   * Update office
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = officeIdSchema.parse({ id })
      const body = await c.req.json()
      const validatedData = updateOfficeSchema.parse(body)

      const office = await officeService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: office,
        message: 'Office updated successfully',
      }, 200)
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
        message: error.message || 'Failed to update office',
      }, error.message === 'Office not found' ? 404 : 400)
    }
  }

  /**
   * Delete office
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = officeIdSchema.parse({ id })

      await officeService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Office deleted successfully',
      }, 200)
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
        message: error.message || 'Failed to delete office',
      }, error.message === 'Office not found' ? 404 : 500)
    }
  }
}

export const officeController = new OfficeController()

