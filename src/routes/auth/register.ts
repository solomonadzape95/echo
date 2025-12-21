import {Hono} from 'hono'

const register = new Hono()

register.get('/', (c) => {
  return c.text('Hello Register!')
})

export default register