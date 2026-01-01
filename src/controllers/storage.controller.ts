import { Context } from 'hono'
import { storageService } from '../services/storage.service'

export class StorageController {
  /**
   * Upload image to Supabase storage
   * POST /admin/storage/upload
   * Content-Type: multipart/form-data
   * Body: { file: File, folder?: string }
   */
  async upload(c: Context) {
    try {
      const formData = await c.req.formData()
      const file = formData.get('file') as File
      const folder = (formData.get('folder') as string) || 'profile-images'

      if (!file) {
        return c.json({
          success: false,
          message: 'No file provided',
        }, 400)
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return c.json({
          success: false,
          message: 'File must be an image',
        }, 400)
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return c.json({
          success: false,
          message: 'File size must be less than 5MB',
        }, 400)
      }

      const publicUrl = await storageService.uploadImage(file, folder)

      return c.json({
        success: true,
        data: {
          url: publicUrl,
        },
        message: 'Image uploaded successfully',
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to upload image',
      }, 500)
    }
  }
}

export const storageController = new StorageController()

