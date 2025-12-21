import {Hono} from 'hono'

const login = new Hono()

login.get('/', (c) => {
  return c.text('Hello Login!')
})

export default login