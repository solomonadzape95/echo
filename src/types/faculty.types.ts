/**
 * Faculty enum values - all available faculties
 */
export const FacultyEnum = {
  AGRICULTURE: 'Faculty of Agriculture',
  ARTS: 'Faculty of Arts',
  BIOLOGICAL_SCIENCES: 'Faculty of Biological Sciences',
  BUSINESS_ADMINISTRATION: 'Faculty of Business Administration (Enugu Campus)',
  EDUCATION: 'Faculty of Education',
  ENGINEERING: 'Faculty of Engineering',
  ENVIRONMENTAL_STUDIES: 'Faculty of Environmental Studies (Enugu Campus)',
  HEALTH_SCIENCES_TECHNOLOGY: 'Faculty of Health Sciences & Technology (Enugu Campus)',
  LAW: 'Faculty of Law (Enugu Campus)',
  PHARMACEUTICAL_SCIENCES: 'Faculty of Pharmaceutical Sciences',
  PHYSICAL_SCIENCES: 'Faculty of Physical Sciences',
  SOCIAL_SCIENCES: 'Faculty of Social Sciences',
  VETERINARY_MEDICINE: 'Faculty of Veterinary Medicine',
  VOCATIONAL_TECHNICAL_EDUCATION: 'Faculty of Vocational and Technical Education',
  MEDICAL_SCIENCES: 'Faculty of Medical Sciences (Enugu Campus)',
  DENTISTRY: 'Faculty of Dentistry (Enugu Campus)',
  BASIC_MEDICAL_SCIENCES: 'Faculty of Basic Medical Sciences (Enugu Campus)',
} as const

export type FacultyName = typeof FacultyEnum[keyof typeof FacultyEnum]

/**
 * Department enum values - all available departments
 */
export const DepartmentEnum = {
  // Faculty of Agriculture
  AGRICULTURAL_ECONOMICS: 'Agricultural Economics',
  AGRICULTURAL_EXTENSION: 'Agricultural Extension',
  ANIMAL_SCIENCE: 'Animal Science',
  CROP_SCIENCE: 'Crop Science',
  FOOD_SCIENCE_TECHNOLOGY: 'Food Science and Technology',
  HOME_SCIENCE_NUTRITION_DIETETICS: 'Home Science, Nutrition and Dietetics',
  SOIL_SCIENCE: 'Soil Science',
  
  // Faculty of Arts
  ARCHAEOLOGY_TOURISM: 'Archaeology and Tourism',
  ENGLISH_LITERARY_STUDIES: 'English and Literary Studies',
  FINE_APPLIED_ARTS: 'Fine and Applied Arts',
  FOREIGN_LANGUAGES_LITERATURE: 'Foreign Languages and Literature',
  HISTORY_INTERNATIONAL_STUDIES: 'History and International Studies',
  LINGUISTICS_IGBO_NIGERIAN_LANGUAGES: 'Linguistics, Igbo and other Nigerian Languages',
  MASS_COMMUNICATION: 'Mass Communication',
  MUSIC: 'Music',
  THEATRE_FILM_STUDIES: 'Theatre and Film Studies',
  
  // Faculty of Biological Sciences
  BIOCHEMISTRY: 'Biochemistry',
  MICROBIOLOGY: 'Microbiology',
  PLANT_SCIENCE_BIOTECHNOLOGY: 'Plant Science and Biotechnology',
  GENETICS_BIOTECHNOLOGY: 'Genetics and Biotechnology',
  ZOOLOGY_ENVIRONMENTAL_BIOLOGY: 'Zoology and Environmental Biology',
  
  // Faculty of Business Administration
  ACCOUNTANCY: 'Accountancy',
  BANKING_FINANCE: 'Banking and Finance',
  MANAGEMENT: 'Management',
  MARKETING: 'Marketing',
  
  // Faculty of Education
  ADULT_EDUCATION_EXTRA_MURAL_STUDIES: 'Adult Education and Extra-Mural Studies',
  ARTS_EDUCATION: 'Arts Education',
  EDUCATIONAL_FOUNDATIONS: 'Educational Foundations',
  HEALTH_PHYSICAL_EDUCATION: 'Health and Physical Education',
  LIBRARY_INFORMATION_SCIENCE: 'Library and Information Science',
  SCIENCE_EDUCATION: 'Science Education',
  SOCIAL_SCIENCE_EDUCATION: 'Social Science Education',
  
  // Faculty of Engineering
  AGRICULTURAL_Bioresources_ENGINEERING: 'Agricultural and Bioresources Engineering',
  BIOMEDICAL_ENGINEERING: 'Biomedical Engineering',
  CIVIL_ENGINEERING: 'Civil Engineering',
  ELECTRICAL_ENGINEERING: 'Electrical Engineering',
  ELECTRONIC_ENGINEERING: 'Electronic Engineering',
  MECHANICAL_ENGINEERING: 'Mechanical Engineering',
  MECHATRONIC_ENGINEERING: 'Mechatronic Engineering',
  METALLURGICAL_MATERIALS_ENGINEERING: 'Metallurgical and Materials Engineering',
  
  // Faculty of Environmental Studies
  ARCHITECTURE: 'Architecture',
  ESTATE_MANAGEMENT: 'Estate Management',
  GEOINFORMATICS_SURVEYING: 'Geoinformatics and Surveying',
  URBAN_REGIONAL_PLANNING: 'Urban and Regional Planning',
  
  // Faculty of Health Sciences & Technology
  HEALTH_ADMINISTRATION_MANAGEMENT: 'Health Administration and Management',
  MEDICAL_LABORATORY_SCIENCE: 'Medical Laboratory Science',
  MEDICAL_RADIOGRAPHY_RADIOLOGICAL_SCIENCES: 'Medical Radiography and Radiological Sciences',
  MEDICAL_REHABILITATION: 'Medical Rehabilitation',
  NURSING_SCIENCES: 'Nursing Sciences',
  
  // Faculty of Law
  COMMERCIAL_PROPERTY_LAW: 'Commercial and Property Law',
  INTERNATIONAL_JURISPRUDENCE_LAW: 'International and Jurisprudence Law',
  PRIVATE_PUBLIC_LAW: 'Private and Public Law',
  CUSTOMARY_INDIGENOUS_LAW: 'Customary and Indigenous Law',
  
  // Faculty of Pharmaceutical Sciences
  CLINICAL_PHARMACY_PHARMACY_MANAGEMENT: 'Clinical Pharmacy and Pharmacy Management',
  PHARMACEUTICAL_CHEMISTRY_INDUSTRIAL_PHARMACY: 'Pharmaceutical Chemistry and Industrial Pharmacy',
  PHARMACEUTICAL_TECHNOLOGY_INDUSTRIAL_PHARMACY: 'Pharmaceutical Technology and Industrial Pharmacy',
  PHARMACEUTICS: 'Pharmaceutics',
  PHARMACOGNOSY_ENVIRONMENTAL_MEDICINES: 'Pharmacognosy and Environmental Medicines',
  PHARMACOLOGY_TOXICOLOGY: 'Pharmacology and Toxicology',
  PHARMACEUTICAL_MICROBIOLOGY_BIOTECHNOLOGY: 'Pharmaceutical Microbiology and Biotechnology',
  
  // Faculty of Physical Sciences
  COMPUTER_SCIENCE: 'Computer Science',
  GEOLOGY: 'Geology',
  MATHEMATICS: 'Mathematics',
  PHYSICS_ASTRONOMY: 'Physics and Astronomy',
  PURE_INDUSTRIAL_CHEMISTRY: 'Pure and Industrial Chemistry',
  SCIENCE_LABORATORY_TECHNOLOGY: 'Science Laboratory Technology',
  STATISTICS: 'Statistics',
  
  // Faculty of Social Sciences
  ECONOMICS: 'Economics',
  GEOGRAPHY: 'Geography',
  PHILOSOPHY: 'Philosophy',
  POLITICAL_SCIENCE: 'Political Science',
  PSYCHOLOGY: 'Psychology',
  PUBLIC_ADMINISTRATION_LOCAL_GOVERNMENT: 'Public Administration and Local Government',
  RELIGION_CULTURAL_STUDIES: 'Religion and Cultural Studies',
  SOCIAL_WORK: 'Social Work',
  SOCIOLOGY_ANTHROPOLOGY: 'Sociology and Anthropology',
  
  // Faculty of Veterinary Medicine
  ANIMAL_HEALTH_PRODUCTION: 'Animal Health and Production',
  VETERINARY_ANATOMY: 'Veterinary Anatomy',
  VETERINARY_MEDICINE: 'Veterinary Medicine',
  VETERINARY_OBSTETRICS_REPRODUCTIVE_DISEASES: 'Veterinary Obstetrics and Reproductive Diseases',
  VETERINARY_PARASITOLOGY_ENTOMOLOGY: 'Veterinary Parasitology and Entomology',
  VETERINARY_PATHOLOGY_MICROBIOLOGY: 'Veterinary Pathology and Microbiology',
  VETERINARY_PHYSIOLOGY_PHARMACOLOGY: 'Veterinary Physiology and Pharmacology',
  VETERINARY_PUBLIC_HEALTH_PREVENTIVE_MEDICINE: 'Veterinary Public Health and Preventive Medicine',
  VETERINARY_SURGERY: 'Veterinary Surgery',
  
  // Faculty of Vocational and Technical Education
  AGRICULTURAL_EDUCATION: 'Agricultural Education',
  BUSINESS_EDUCATION: 'Business Education',
  COMPUTER_EDUCATION: 'Computer Education',
  HOME_ECONOMICS_HOSPITALITY_MANAGEMENT_EDUCATION: 'Home Economics and Hospitality Management Education',
  INDUSTRIAL_TECHNICAL_EDUCATION: 'Industrial Technical Education',
  
  // Faculty of Medical Sciences
  ANATOMY: 'Anatomy',
  MEDICAL_BIOCHEMISTRY: 'Medical Biochemistry',
  MEDICINE_SURGERY: 'Medicine and Surgery',
  PHYSIOLOGY: 'Physiology',
  
  // Faculty of Dentistry
  CHILD_DENTAL_HEALTH: 'Child Dental Health',
  ORAL_MAXILLOFACIAL_SURGERY: 'Oral and Maxillofacial Surgery',
  PREVENTIVE_COMMUNITY_DENTISTRY: 'Preventive and Community Dentistry',
  RESTORATIVE_DENTISTRY: 'Restorative Dentistry',
  
  // Faculty of Basic Medical Sciences
  HUMAN_PHYSIOLOGY: 'Human Physiology',
} as const

export type DepartmentName = typeof DepartmentEnum[keyof typeof DepartmentEnum]

/**
 * Mapping of faculties to their departments
 * Used for validation to ensure departments belong to their faculty
 */
export const FacultyDepartmentMap: Record<FacultyName, DepartmentName[]> = {
  [FacultyEnum.AGRICULTURE]: [
    DepartmentEnum.AGRICULTURAL_ECONOMICS,
    DepartmentEnum.AGRICULTURAL_EXTENSION,
    DepartmentEnum.ANIMAL_SCIENCE,
    DepartmentEnum.CROP_SCIENCE,
    DepartmentEnum.FOOD_SCIENCE_TECHNOLOGY,
    DepartmentEnum.HOME_SCIENCE_NUTRITION_DIETETICS,
    DepartmentEnum.SOIL_SCIENCE,
  ],
  [FacultyEnum.ARTS]: [
    DepartmentEnum.ARCHAEOLOGY_TOURISM,
    DepartmentEnum.ENGLISH_LITERARY_STUDIES,
    DepartmentEnum.FINE_APPLIED_ARTS,
    DepartmentEnum.FOREIGN_LANGUAGES_LITERATURE,
    DepartmentEnum.HISTORY_INTERNATIONAL_STUDIES,
    DepartmentEnum.LINGUISTICS_IGBO_NIGERIAN_LANGUAGES,
    DepartmentEnum.MASS_COMMUNICATION,
    DepartmentEnum.MUSIC,
    DepartmentEnum.THEATRE_FILM_STUDIES,
  ],
  [FacultyEnum.BIOLOGICAL_SCIENCES]: [
    DepartmentEnum.BIOCHEMISTRY,
    DepartmentEnum.MICROBIOLOGY,
    DepartmentEnum.PLANT_SCIENCE_BIOTECHNOLOGY,
    DepartmentEnum.GENETICS_BIOTECHNOLOGY,
    DepartmentEnum.ZOOLOGY_ENVIRONMENTAL_BIOLOGY,
  ],
  [FacultyEnum.BUSINESS_ADMINISTRATION]: [
    DepartmentEnum.ACCOUNTANCY,
    DepartmentEnum.BANKING_FINANCE,
    DepartmentEnum.MANAGEMENT,
    DepartmentEnum.MARKETING,
  ],
  [FacultyEnum.EDUCATION]: [
    DepartmentEnum.ADULT_EDUCATION_EXTRA_MURAL_STUDIES,
    DepartmentEnum.ARTS_EDUCATION,
    DepartmentEnum.EDUCATIONAL_FOUNDATIONS,
    DepartmentEnum.HEALTH_PHYSICAL_EDUCATION,
    DepartmentEnum.LIBRARY_INFORMATION_SCIENCE,
    DepartmentEnum.SCIENCE_EDUCATION,
    DepartmentEnum.SOCIAL_SCIENCE_EDUCATION,
  ],
  [FacultyEnum.ENGINEERING]: [
    DepartmentEnum.AGRICULTURAL_Bioresources_ENGINEERING,
    DepartmentEnum.BIOMEDICAL_ENGINEERING,
    DepartmentEnum.CIVIL_ENGINEERING,
    DepartmentEnum.ELECTRICAL_ENGINEERING,
    DepartmentEnum.ELECTRONIC_ENGINEERING,
    DepartmentEnum.MECHANICAL_ENGINEERING,
    DepartmentEnum.MECHATRONIC_ENGINEERING,
    DepartmentEnum.METALLURGICAL_MATERIALS_ENGINEERING,
  ],
  [FacultyEnum.ENVIRONMENTAL_STUDIES]: [
    DepartmentEnum.ARCHITECTURE,
    DepartmentEnum.ESTATE_MANAGEMENT,
    DepartmentEnum.GEOINFORMATICS_SURVEYING,
    DepartmentEnum.URBAN_REGIONAL_PLANNING,
  ],
  [FacultyEnum.HEALTH_SCIENCES_TECHNOLOGY]: [
    DepartmentEnum.HEALTH_ADMINISTRATION_MANAGEMENT,
    DepartmentEnum.MEDICAL_LABORATORY_SCIENCE,
    DepartmentEnum.MEDICAL_RADIOGRAPHY_RADIOLOGICAL_SCIENCES,
    DepartmentEnum.MEDICAL_REHABILITATION,
    DepartmentEnum.NURSING_SCIENCES,
  ],
  [FacultyEnum.LAW]: [
    DepartmentEnum.COMMERCIAL_PROPERTY_LAW,
    DepartmentEnum.INTERNATIONAL_JURISPRUDENCE_LAW,
    DepartmentEnum.PRIVATE_PUBLIC_LAW,
    DepartmentEnum.CUSTOMARY_INDIGENOUS_LAW,
  ],
  [FacultyEnum.PHARMACEUTICAL_SCIENCES]: [
    DepartmentEnum.CLINICAL_PHARMACY_PHARMACY_MANAGEMENT,
    DepartmentEnum.PHARMACEUTICAL_CHEMISTRY_INDUSTRIAL_PHARMACY,
    DepartmentEnum.PHARMACEUTICAL_TECHNOLOGY_INDUSTRIAL_PHARMACY,
    DepartmentEnum.PHARMACEUTICS,
    DepartmentEnum.PHARMACOGNOSY_ENVIRONMENTAL_MEDICINES,
    DepartmentEnum.PHARMACOLOGY_TOXICOLOGY,
    DepartmentEnum.PHARMACEUTICAL_MICROBIOLOGY_BIOTECHNOLOGY,
  ],
  [FacultyEnum.PHYSICAL_SCIENCES]: [
    DepartmentEnum.COMPUTER_SCIENCE,
    DepartmentEnum.GEOLOGY,
    DepartmentEnum.MATHEMATICS,
    DepartmentEnum.PHYSICS_ASTRONOMY,
    DepartmentEnum.PURE_INDUSTRIAL_CHEMISTRY,
    DepartmentEnum.SCIENCE_LABORATORY_TECHNOLOGY,
    DepartmentEnum.STATISTICS,
  ],
  [FacultyEnum.SOCIAL_SCIENCES]: [
    DepartmentEnum.ECONOMICS,
    DepartmentEnum.GEOGRAPHY,
    DepartmentEnum.PHILOSOPHY,
    DepartmentEnum.POLITICAL_SCIENCE,
    DepartmentEnum.PSYCHOLOGY,
    DepartmentEnum.PUBLIC_ADMINISTRATION_LOCAL_GOVERNMENT,
    DepartmentEnum.RELIGION_CULTURAL_STUDIES,
    DepartmentEnum.SOCIAL_WORK,
    DepartmentEnum.SOCIOLOGY_ANTHROPOLOGY,
  ],
  [FacultyEnum.VETERINARY_MEDICINE]: [
    DepartmentEnum.ANIMAL_HEALTH_PRODUCTION,
    DepartmentEnum.VETERINARY_ANATOMY,
    DepartmentEnum.VETERINARY_MEDICINE,
    DepartmentEnum.VETERINARY_OBSTETRICS_REPRODUCTIVE_DISEASES,
    DepartmentEnum.VETERINARY_PARASITOLOGY_ENTOMOLOGY,
    DepartmentEnum.VETERINARY_PATHOLOGY_MICROBIOLOGY,
    DepartmentEnum.VETERINARY_PHYSIOLOGY_PHARMACOLOGY,
    DepartmentEnum.VETERINARY_PUBLIC_HEALTH_PREVENTIVE_MEDICINE,
    DepartmentEnum.VETERINARY_SURGERY,
  ],
  [FacultyEnum.VOCATIONAL_TECHNICAL_EDUCATION]: [
    DepartmentEnum.AGRICULTURAL_EDUCATION,
    DepartmentEnum.BUSINESS_EDUCATION,
    DepartmentEnum.COMPUTER_EDUCATION,
    DepartmentEnum.HOME_ECONOMICS_HOSPITALITY_MANAGEMENT_EDUCATION,
    DepartmentEnum.INDUSTRIAL_TECHNICAL_EDUCATION,
  ],
  [FacultyEnum.MEDICAL_SCIENCES]: [
    DepartmentEnum.ANATOMY,
    DepartmentEnum.MEDICAL_BIOCHEMISTRY,
    DepartmentEnum.MEDICINE_SURGERY,
    DepartmentEnum.PHYSIOLOGY,
  ],
  [FacultyEnum.DENTISTRY]: [
    DepartmentEnum.CHILD_DENTAL_HEALTH,
    DepartmentEnum.ORAL_MAXILLOFACIAL_SURGERY,
    DepartmentEnum.PREVENTIVE_COMMUNITY_DENTISTRY,
    DepartmentEnum.RESTORATIVE_DENTISTRY,
  ],
  [FacultyEnum.BASIC_MEDICAL_SCIENCES]: [
    DepartmentEnum.ANATOMY,
    DepartmentEnum.HUMAN_PHYSIOLOGY,
    DepartmentEnum.MEDICAL_BIOCHEMISTRY,
  ],
}

/**
 * Helper function to validate if a department belongs to a faculty
 */
export function isDepartmentInFaculty(department: DepartmentName, faculty: FacultyName): boolean {
  const validDepartments = FacultyDepartmentMap[faculty]
  return validDepartments?.includes(department) ?? false
}

/**
 * Get all departments for a faculty
 */
export function getDepartmentsForFaculty(faculty: FacultyName): DepartmentName[] {
  return FacultyDepartmentMap[faculty] || []
}

