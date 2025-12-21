import {Hono} from 'hono'

const checkLedger = new Hono()

checkLedger.get('/', (c) => {
  return c.text('Hello Check Ledger!')
})

export default checkLedger