import { db } from '../db/db'
import { eq, and } from 'drizzle-orm'
import { classes } from '../models/class.schema'
import { UpdateClassInput, CreateClassInput } from '../validators/class.validator'
import { FacultyEnum, DepartmentEnum, isDepartmentInFaculty } from '../types/faculty.types'

export class ClassService {
    /**
     * Create a new class
     */
    async create(input: CreateClassInput) {
        const { level, faculty, department } = input

        // Validate faculty is a valid enum value
        if (!Object.values(FacultyEnum).includes(faculty as any)) {
            throw new Error('Invalid faculty name')
        }

        // Validate department is a valid enum value
        if (!Object.values(DepartmentEnum).includes(department as any)) {
            throw new Error('Invalid department name')
        }

        // Validate department belongs to faculty
        if (!isDepartmentInFaculty(department, faculty)) {
            throw new Error('Department does not belong to the specified faculty')
        }

        // check if class already exists
        const [existingClass] = await db.select().from(classes).where(and(eq(classes.level, level), eq(classes.faculty, faculty), eq(classes.department, department)))
        if(existingClass){
            throw new Error("Class configuration already exists")
        }

        const [newClass] = await db.insert(classes).values({level, faculty, department}).returning()
        if(!newClass){
            throw new Error("Failed to create class")
        }

        return newClass
    }

    /**
     * Get a class by ID
     */
    async getById(input: string) {
        const id = input
        const [classData] = await db.select().from(classes).where(eq(classes.id, id))
        if(!classData){
            throw new Error('Class not found')
        }
        return classData
    }

    /**
     * Get all classes
     */
    async getAll() {
        const classesData = await db.select().from(classes)
        if(!classesData){
            throw new Error('No classes found')
        }
        return classesData
    }

    /**
     * Update a class
     */
    async update(id: string, input: UpdateClassInput) {
        const { level, faculty, department } = input
        
        // Validate faculty is a valid enum value
        if (faculty && !Object.values(FacultyEnum).includes(faculty as any)) {
            throw new Error('Invalid faculty name')
        }

        // Validate department is a valid enum value
        if (department && !Object.values(DepartmentEnum).includes(department as any)) {
            throw new Error('Invalid department name')
        }

        // Validate department belongs to faculty if both are provided
        if (faculty && department && !isDepartmentInFaculty(department, faculty)) {
            throw new Error('Department does not belong to the specified faculty')
        }

        const [classData] = await db.select().from(classes).where(eq(classes.id, id))
        if(!classData){
            throw new Error('Class not found')
        }

        const updateData: any = { level }
        if (faculty) updateData.faculty = faculty
        if (department) updateData.department = department

        const [updatedClass] = await db.update(classes).set(updateData).where(eq(classes.id, id)).returning()
        if(!updatedClass){
            throw new Error('Failed to update class')
        }
        return updatedClass
    }

    /**
     * Delete a class
     */
    async delete(id: string) {
        const [classData] = await db.select().from(classes).where(eq(classes.id, id))
        if(!classData){
            throw new Error('Class not found')
        }
        await db.delete(classes).where(eq(classes.id, id))
        return { success: true }
    }
}

export const classService = new ClassService()