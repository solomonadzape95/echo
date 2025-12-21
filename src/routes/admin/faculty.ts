import {Hono} from  'hono'

const faculty = new Hono()

faculty.get('/', (c) => {
    return c.text('Hello Faculty!')
})
export default faculty