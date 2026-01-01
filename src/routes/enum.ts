import { Hono } from 'hono'
import { enumController } from '../controllers/enum.controller'

const enumRoute = new Hono()

// GET /enum - Get all enums (faculties, departments, and mapping)
enumRoute.get('/', (c) => enumController.getEnums(c))

// GET /enum/faculties - Get all faculties
enumRoute.get('/faculties', (c) => enumController.getFaculties(c))

// GET /enum/departments - Get all departments
enumRoute.get('/departments', (c) => enumController.getDepartments(c))

// GET /enum/faculties/:faculty/departments - Get departments for a specific faculty
enumRoute.get('/faculties/:faculty/departments', (c) => enumController.getDepartmentsForFaculty(c))

export default enumRoute

