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
      console.log('[STORAGE CONTROLLER] Upload request received')
      const formData = await c.req.formData()
      const file = formData.get('file') as File
      const folder = (formData.get('folder') as string) || 'profile-images'

      console.log('[STORAGE CONTROLLER] File:', file?.name, 'Folder:', folder)

      if (!file) {
        console.error('[STORAGE CONTROLLER] No file provided')
        return c.json({
          success: false,
          message: 'No file provided',
        }, 400)
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('[STORAGE CONTROLLER] Invalid file type:', file.type)
        return c.json({
          success: false,
          message: 'File must be an image',
        }, 400)
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        console.error('[STORAGE CONTROLLER] File too large:', file.size)
        return c.json({
          success: false,
          message: 'File size must be less than 5MB',
        }, 400)
      }

      console.log('[STORAGE CONTROLLER] Calling storageService.uploadImage')
      const publicUrl = await storageService.uploadImage(file, folder)
      console.log('[STORAGE CONTROLLER] Upload successful, URL:', publicUrl)

      return c.json({
        success: true,
        data: {
          url: publicUrl,
        },
        message: 'Image uploaded successfully',
      }, 200)
    } catch (error: any) {
      console.error('[STORAGE CONTROLLER] Error:', error)
      console.error('[STORAGE CONTROLLER] Error stack:', error.stack)
      return c.json({
        success: false,
        message: error.message || 'Failed to upload image',
      }, 500)
    }
  }
}

export const storageController = new StorageController()

