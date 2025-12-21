import {Hono} from 'hono'

const forgotPassword = new Hono()

forgotPassword.get('/', (c) => {
  return c.text('Hello Forgot Password!')
})

export default forgotPassword