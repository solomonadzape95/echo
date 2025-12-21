import {Hono} from 'hono'

const vote = new Hono()

vote.get('/', (c) => {
  return c.text('Hello Vote!')
})

export default vote