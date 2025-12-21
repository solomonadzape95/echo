import { Hono } from 'hono'

const department = new Hono()

department.get('/', (c) => {
  return c.text('Hello Department!')
})

export default department