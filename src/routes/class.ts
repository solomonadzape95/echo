import { Hono } from 'hono'

const classRoute = new Hono()

classRoute.get('/', (c) => {
  return c.text('Hello Class!')
})

export default classRoute