import {Hono} from 'hono'

const verifyEligibility = new Hono()

verifyEligibility.get('/', (c) => {
  return c.text('Hello Verify Eligibility!')
})

export default verifyEligibility