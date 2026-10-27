import { Hono } from 'hono'
import path from 'node:path'

const app = new Hono()

/**
 * Public app-release manifest for the native Android updater.
 *
 * Publish a new APK (for example as a GitHub Release asset), then set these
 * environment variables on Render:
 *   APP_VERSION_CODE, APP_VERSION_NAME, APP_APK_URL, APP_RELEASE_NOTES
 */
app.get('/version', (c) => {
  const apkUrl = process.env.APP_APK_URL?.trim()

  if (!apkUrl) {
    return c.json({
      success: true,
      data: {
        updateAvailable: false,
      },
    }, 200)
  }

  return c.json({
    success: true,
    data: {
      updateAvailable: true,
      versionCode: Number(process.env.APP_VERSION_CODE || 0),
      versionName: process.env.APP_VERSION_NAME || 'latest',
      apkUrl,
      notes: process.env.APP_RELEASE_NOTES || '',
    },
  }, 200)
})

/**
 * Serve the current demo APK for the in-app updater.
 *
 * `APP_APK_URL` can point here (for example
 * `http://192.168.1.121:3001/app/download`) when there is no object storage.
 * The file is read from APP_APK_PATH, or from the repo's releases folder.
 */
app.get('/download', async (c) => {
  const configured = process.env.APP_APK_PATH?.trim()
  const apkPath = configured
    ? path.resolve(process.cwd(), configured)
    : path.resolve(import.meta.dir, '../../../apps/mobile-android/releases/blindvote-latest.apk')

  const file = Bun.file(apkPath)
  if (!(await file.exists())) {
    return c.json({ success: false, message: 'APK not found' }, 404)
  }

  return new Response(file, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="blindvote.apk"',
      'Cache-Control': 'no-store',
      'Content-Length': String(file.size),
    },
  })
})

export default app
