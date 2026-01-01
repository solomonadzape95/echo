import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// For server-side uploads (admin operations), we use the service role key
// which bypasses RLS policies. This is safe because the endpoint is protected by adminMiddleware.
const supabaseUrl = process.env.SUPABASE_URL || 'https://woadzoofekjqzbjvzqhj.supabase.co'
// Use service role key for server-side operations (bypasses RLS)
// Get this from: Supabase Dashboard -> Project Settings -> API -> service_role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[STORAGE SERVICE] Supabase service role key not found. Image uploads will be disabled.')
  console.warn('[STORAGE SERVICE] Set SUPABASE_SERVICE_ROLE_KEY environment variable.')
}

// Use service role key for server-side operations (bypasses RLS)
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export class StorageService {
  /**
   * Upload an image to Supabase storage
   * @param file - File to upload
   * @param folder - Folder path in bucket (e.g., 'profile-images')
   * @returns Public URL of uploaded image
   */
  async uploadImage(file: File, folder: string = 'profile-images'): Promise<string> {
    if (!supabase) {
      console.error('[STORAGE SERVICE] Supabase client not initialized')
      throw new Error('Supabase storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }

    const bucketName = 'profile-images'
    console.log('[STORAGE SERVICE] Uploading file:', file.name, 'to bucket:', bucketName, 'folder:', folder)

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${folder}/${fileName}`
    console.log('[STORAGE SERVICE] Generated file path:', filePath)

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    console.log('[STORAGE SERVICE] File size:', file.size, 'bytes')

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('[STORAGE SERVICE] Upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    console.log('[STORAGE SERVICE] Upload successful, data:', data)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      console.error('[STORAGE SERVICE] Failed to get public URL')
      throw new Error('Failed to get public URL for uploaded image')
    }

    console.log('[STORAGE SERVICE] Public URL:', urlData.publicUrl)
    return urlData.publicUrl
  }

  /**
   * Delete an image from Supabase storage
   * @param filePath - Path to file in storage
   */
  async deleteImage(filePath: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase storage is not configured')
    }

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  }
}

export const storageService = new StorageService()

