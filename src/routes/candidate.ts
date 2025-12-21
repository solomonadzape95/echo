import { Hono } from 'hono'

const candidate = new Hono()

candidate.get('/', (c) => {
  return c.text('Hello Candidate!')
})

export default candidate