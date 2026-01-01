import { Hono } from 'hono'
import { officeTemplateController } from '../controllers/office-template.controller'

const officeTemplate = new Hono()

// GET /office-templates?type=class|department|faculty - Get templates by election type
officeTemplate.get('/', (c) => {
  const type = c.req.query('type')
  if (type) {
    return officeTemplateController.getByType(c)
  }
  return officeTemplateController.getAll(c)
})

export default officeTemplate

