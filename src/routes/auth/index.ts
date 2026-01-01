import { Hono } from 'hono'
import register from './register'
import login from './login'
import forgotPassword from './forgot-password'
import resetPassword from './reset-password'
import changePassword from './change-password'
import refresh from './refresh'
import logout from './logout'

const auth = new Hono()

// Routes are mounted at /auth in main app, so no basePath needed here
auth.route("/register", register)
auth.route("/login", login)
auth.route("/forgot-password", forgotPassword)
auth.route("/reset-password", resetPassword)
auth.route("/change-password", changePassword)
auth.route("/refresh", refresh)
auth.route("/logout", logout)

export default auth