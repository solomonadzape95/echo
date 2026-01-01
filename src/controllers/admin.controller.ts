import { Context } from 'hono'
import { adminService } from '../services/admin.service'
import { 
  adminLoginSchema, 
  createAdminSchema, 
  updateAdminSchema, 
  adminIdSchema 
} from '../validators/admin.validator'
import { setAccessTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helpers'

export class AdminController {
  /**
   * Admin login
   * POST /admin/auth/login
   */
  async login(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = adminLoginSchema.parse(body)

      const { admin, accessToken, refreshToken } = await adminService.login(validatedData)

      // Set tokens in secure cookies
      setAccessTokenCookie(c, accessToken)
      setRefreshTokenCookie(c, refreshToken)

      return c.json({
        success: true,
        data: {
          admin,
        },
        message: 'Admin login successful',
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
        message: error.message || 'Login failed',
      }, 401)
    }
  }

  /**
   * Get all admins
   * GET /admin/admin
   */
  async getAll(c: Context) {
    try {
      const admins = await adminService.getAll()

      return c.json({
        success: true,
        data: admins,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch admins',
      }, 500)
    }
  }

  /**
   * Get admin by ID
   * GET /admin/admin/:id
   */
  async getById(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = adminIdSchema.parse({ id })

      const admin = await adminService.getById(validatedId.id)

      return c.json({
        success: true,
        data: admin,
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
        message: error.message || 'Failed to fetch admin',
      }, error.message === 'Admin not found' ? 404 : 500)
    }
  }

  /**
   * Create new admin
   * POST /admin/admin
   */
  async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createAdminSchema.parse(body)

      const admin = await adminService.create(validatedData)

      return c.json({
        success: true,
        data: admin,
        message: 'Admin created successfully',
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
        message: error.message || 'Failed to create admin',
      }, 400)
    }
  }

  /**
   * Update admin
   * PUT /admin/admin/:id
   */
  async update(c: Context) {
    try {
      const id = c.req.param('id')
      const body = await c.req.json()
      const validatedId = adminIdSchema.parse({ id })
      const validatedData = updateAdminSchema.parse(body)

      // Prevent admin from deleting themselves
      const currentAdmin = c.get('admin')
      if (currentAdmin && currentAdmin.id === validatedId.id && validatedData.role) {
        // Allow role change but warn
        console.warn('Admin is updating their own role')
      }

      const admin = await adminService.update(validatedId.id, validatedData)

      return c.json({
        success: true,
        data: admin,
        message: 'Admin updated successfully',
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
        message: error.message || 'Failed to update admin',
      }, error.message === 'Admin not found' ? 404 : 400)
    }
  }

  /**
   * Delete admin
   * DELETE /admin/admin/:id
   */
  async delete(c: Context) {
    try {
      const id = c.req.param('id')
      const validatedId = adminIdSchema.parse({ id })

      // Prevent admin from deleting themselves
      const currentAdmin = c.get('admin')
      if (currentAdmin && currentAdmin.id === validatedId.id) {
        return c.json({
          success: false,
          message: 'You cannot delete your own account',
        }, 403)
      }

      await adminService.delete(validatedId.id)

      return c.json({
        success: true,
        message: 'Admin deleted successfully',
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
        message: error.message || 'Failed to delete admin',
      }, error.message === 'Admin not found' ? 404 : 500)
    }
  }
}

export const adminController = new AdminController()

