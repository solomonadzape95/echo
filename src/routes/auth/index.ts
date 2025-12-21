import { Hono } from 'hono'
import register from './register'
import login from './login'
import forgotPassword from './forgot-password'

const auth = new Hono().basePath("/auth")

auth.route("/register", register)
auth.route("/login", login)
auth.route("/forgot-password", forgotPassword)

export default auth