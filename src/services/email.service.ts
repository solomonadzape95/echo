import { Resend } from 'resend'

// Initialize Resend client
// Check both RESEND_API_KEY and RESEND_API_KEY_ (in case of typo in .env)
const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Get frontend URL from environment or default to localhost
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
// FROM_EMAIL must be from a verified domain in Resend
// Format: "Name <email@yourdomain.com>" or just "email@yourdomain.com"
// Default uses Resend's testing domain (only works in development)
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

export class EmailService {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string) {
    if (!resend) {
      console.warn('[EMAIL SERVICE] Resend API key not configured. Email not sent.')
      console.warn('[EMAIL SERVICE] Reset token (for testing):', resetToken)
      return { success: false, message: 'Email service not configured' }
    }

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset Your Password - Echo Platform',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
              <div style="background-color: #102222; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="color: #13ecec; margin: 0; font-size: 24px; text-align: center;">Echo Platform</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #102222; margin-top: 0;">Password Reset Request</h2>
                
                <p>Hello ${name},</p>
                
                <p>We received a request to reset your password for your Echo Platform account. Click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background-color: #13ecec; color: #112222; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                <p style="color: #13ecec; font-size: 12px; word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>This link will expire in 1 hour.</strong>
                </p>
                
                <p style="color: #666; font-size: 14px;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} Echo Platform. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
        text: `
          Echo Platform - Password Reset Request
          
          Hello ${name},
          
          We received a request to reset your password for your Echo Platform account.
          
          Reset your password by visiting this link:
          ${resetUrl}
          
          This link will expire in 1 hour.
          
          If you didn't request a password reset, you can safely ignore this email.
          
          ---
          This is an automated message. Please do not reply to this email.
        `,
      })

      if (error) {
        console.error('[EMAIL SERVICE] Error sending email:', error)
        return { success: false, message: error.message || 'Failed to send email' }
      }

      console.log('[EMAIL SERVICE] Password reset email sent successfully to:', email)
      return { success: true, messageId: data?.id }
    } catch (error: any) {
      console.error('[EMAIL SERVICE] Exception sending email:', error)
      return { success: false, message: error.message || 'Failed to send email' }
    }
  }

  /**
   * Send account creation welcome email
   */
  async sendWelcomeEmail(email: string, name: string) {
    if (!resend) {
      console.warn('[EMAIL SERVICE] Resend API key not configured. Email not sent.')
      return { success: false, message: 'Email service not configured' }
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Welcome to Echo Platform',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Echo Platform</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
              <div style="background-color: #102222; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="color: #13ecec; margin: 0; font-size: 24px; text-align: center;">Echo Platform</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #102222; margin-top: 0;">Welcome to Echo Platform!</h2>
                
                <p>Hello ${name},</p>
                
                <p>Your account has been successfully created. You can now log in and participate in elections.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${FRONTEND_URL}/login" style="display: inline-block; background-color: #13ecec; color: #112222; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Log In</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  If you have any questions or need assistance, please contact your administrator.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} Echo Platform. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      })

      if (error) {
        console.error('[EMAIL SERVICE] Error sending welcome email:', error)
        return { success: false, message: error.message || 'Failed to send email' }
      }

      console.log('[EMAIL SERVICE] Welcome email sent successfully to:', email)
      return { success: true, messageId: data?.id }
    } catch (error: any) {
      console.error('[EMAIL SERVICE] Exception sending welcome email:', error)
      return { success: false, message: error.message || 'Failed to send email' }
    }
  }
}

export const emailService = new EmailService()

