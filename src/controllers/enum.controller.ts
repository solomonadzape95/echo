import { Context } from 'hono'
import { FacultyEnum, DepartmentEnum, FacultyDepartmentMap } from '../types/faculty.types'

export class EnumController {
  /**
   * Get all faculty and department enums
   * GET /enums
   */
  async getEnums(c: Context) {
    try {
      return c.json({
        success: true,
        data: {
          faculties: FacultyEnum,
          departments: DepartmentEnum,
          facultyDepartmentMap: FacultyDepartmentMap,
        },
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch enums',
      }, 500)
    }
  }

  /**
   * Get only faculty enum
   * GET /enums/faculties
   */
  async getFaculties(c: Context) {
    try {
      return c.json({
        success: true,
        data: FacultyEnum,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch faculties',
      }, 500)
    }
  }

  /**
   * Get only department enum
   * GET /enums/departments
   */
  async getDepartments(c: Context) {
    try {
      return c.json({
        success: true,
        data: DepartmentEnum,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch departments',
      }, 500)
    }
  }

  /**
   * Get departments for a specific faculty
   * GET /enums/faculties/:faculty/departments
   */
  async getDepartmentsForFaculty(c: Context) {
    try {
      const faculty = c.req.param('faculty')
      
      if (!faculty) {
        return c.json({
          success: false,
          message: 'Faculty parameter is required',
        }, 400)
      }

      // Validate faculty exists
      const facultyValues = Object.values(FacultyEnum)
      if (!facultyValues.includes(faculty as any)) {
        return c.json({
          success: false,
          message: 'Invalid faculty',
        }, 400)
      }

      const departments = FacultyDepartmentMap[faculty as keyof typeof FacultyDepartmentMap] || []

      return c.json({
        success: true,
        data: departments,
      }, 200)
    } catch (error: any) {
      return c.json({
        success: false,
        message: error.message || 'Failed to fetch departments',
      }, 500)
    }
  }
}

export const enumController = new EnumController()

