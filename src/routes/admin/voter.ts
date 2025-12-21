import { Hono } from 'hono'

const voter = new Hono()

voter.get('/', (c) => {
  return c.text('Hello Voter!')
})
// other endpoints 
export default voter