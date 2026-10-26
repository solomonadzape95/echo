import { Hono } from 'hono'

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

export default app
