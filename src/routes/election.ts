import {Hono} from 'hono'

const election = new Hono()

election.get("/", (c) => {
    return c.text("Hello election!")
})

export default election