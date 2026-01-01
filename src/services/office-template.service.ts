import officeTemplates from '../data/office-templates.json'

export interface OfficeTemplate {
  title: string
  description: string
}

export type ElectionType = 'class' | 'department' | 'faculty'

export class OfficeTemplateService {
  /**
   * Get office templates for a specific election type
   */
  getTemplatesByType(type: ElectionType): OfficeTemplate[] {
    const keyMap: Record<ElectionType, keyof typeof officeTemplates> = {
      class: 'class_level_offices',
      department: 'department_level_offices',
      faculty: 'faculty_level_offices',
    }

    const key = keyMap[type]
    if (!key) {
      throw new Error(`Invalid election type: ${type}`)
    }

    return (officeTemplates[key] as OfficeTemplate[]) || []
  }

  /**
   * Get all office templates
   */
  getAllTemplates(): typeof officeTemplates {
    return officeTemplates
  }
}

export const officeTemplateService = new OfficeTemplateService()

