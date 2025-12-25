import { db } from '../db/db'
import { eq, and } from 'drizzle-orm'
import { classes } from '../models/class.schema'
import { faculties } from '../models/faculty.schema'
import { departments } from '../models/department.schema'
import { UpdateClassInput, CreateClassInput } from '../validators/class.validator'

export class ClassService {
    /**
     * Create a new class
     */
    async create(input: CreateClassInput) {
        const { level, facultyId, departmentId } = input

        // Verify faculty exists
        const [faculty] = await db.select().from(faculties).where(eq(faculties.id, facultyId))
        if (!faculty) {
            throw new Error('Faculty not found')
        }

        // Verify department exists
        const [department] = await db.select().from(departments).where(eq(departments.id, departmentId))
        if (!department) {
            throw new Error('Department not found')
        }

        // check if class already exists
        const [existingClass] = await db.select().from(classes).where(and(eq(classes.level, level), eq(classes.faculty, facultyId), eq(classes.department, departmentId)))
        if(existingClass){
            throw new Error("Class configuration already exists")
        }

        const [newClass] = await db.insert(classes).values({level, faculty: facultyId, department: departmentId}).returning()
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
        const { level, facultyId, departmentId } = input
        const [classData] = await db.select().from(classes).where(eq(classes.id, id))
        if(!classData){
            throw new Error('Class not found')
        }

        const [updatedClass] = await db.update(classes).set({level, faculty: facultyId, department: departmentId}).where(eq(classes.id, id)).returning()
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