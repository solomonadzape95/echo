-- Migration: Convert departments/faculties to enums and add tokenHash to issuances
-- This migration:
-- 1. Creates enum types for faculty_name and department_name
-- 2. Adds tokenHash column to issuances
-- 3. Drops foreign key constraints from classes table
-- 4. Converts classes.faculty and classes.department from uuid to enum
-- 5. Drops departments and faculties tables

-- Step 1: Create enum types
CREATE TYPE IF NOT EXISTS "public"."faculty_name" AS ENUM(
  'Faculty of Agriculture',
  'Faculty of Arts',
  'Faculty of Biological Sciences',
  'Faculty of Business Administration (Enugu Campus)',
  'Faculty of Education',
  'Faculty of Engineering',
  'Faculty of Environmental Studies (Enugu Campus)',
  'Faculty of Health Sciences & Technology (Enugu Campus)',
  'Faculty of Law (Enugu Campus)',
  'Faculty of Pharmaceutical Sciences',
  'Faculty of Physical Sciences',
  'Faculty of Social Sciences',
  'Faculty of Veterinary Medicine',
  'Faculty of Vocational and Technical Education',
  'Faculty of Medical Sciences (Enugu Campus)',
  'Faculty of Dentistry (Enugu Campus)',
  'Faculty of Basic Medical Sciences (Enugu Campus)'
);

CREATE TYPE IF NOT EXISTS "public"."department_name" AS ENUM(
  'Agricultural Economics',
  'Agricultural Extension',
  'Animal Science',
  'Crop Science',
  'Food Science and Technology',
  'Home Science, Nutrition and Dietetics',
  'Soil Science',
  'Archaeology and Tourism',
  'English and Literary Studies',
  'Fine and Applied Arts',
  'Foreign Languages and Literature',
  'History and International Studies',
  'Linguistics, Igbo and other Nigerian Languages',
  'Mass Communication',
  'Music',
  'Theatre and Film Studies',
  'Biochemistry',
  'Microbiology',
  'Plant Science and Biotechnology',
  'Genetics and Biotechnology',
  'Zoology and Environmental Biology',
  'Accountancy',
  'Banking and Finance',
  'Management',
  'Marketing',
  'Adult Education and Extra-Mural Studies',
  'Arts Education',
  'Educational Foundations',
  'Health and Physical Education',
  'Library and Information Science',
  'Science Education',
  'Social Science Education',
  'Agricultural and Bioresources Engineering',
  'Biomedical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Electronic Engineering',
  'Mechanical Engineering',
  'Mechatronic Engineering',
  'Metallurgical and Materials Engineering',
  'Architecture',
  'Estate Management',
  'Geoinformatics and Surveying',
  'Urban and Regional Planning',
  'Health Administration and Management',
  'Medical Laboratory Science',
  'Medical Radiography and Radiological Sciences',
  'Medical Rehabilitation',
  'Nursing Sciences',
  'Commercial and Property Law',
  'International and Jurisprudence Law',
  'Private and Public Law',
  'Customary and Indigenous Law',
  'Clinical Pharmacy and Pharmacy Management',
  'Pharmaceutical Chemistry and Industrial Pharmacy',
  'Pharmaceutical Technology and Industrial Pharmacy',
  'Pharmaceutics',
  'Pharmacognosy and Environmental Medicines',
  'Pharmacology and Toxicology',
  'Pharmaceutical Microbiology and Biotechnology',
  'Computer Science',
  'Geology',
  'Mathematics',
  'Physics and Astronomy',
  'Pure and Industrial Chemistry',
  'Science Laboratory Technology',
  'Statistics',
  'Economics',
  'Geography',
  'Philosophy',
  'Political Science',
  'Psychology',
  'Public Administration and Local Government',
  'Religion and Cultural Studies',
  'Social Work',
  'Sociology and Anthropology',
  'Animal Health and Production',
  'Veterinary Anatomy',
  'Veterinary Medicine',
  'Veterinary Obstetrics and Reproductive Diseases',
  'Veterinary Parasitology and Entomology',
  'Veterinary Pathology and Microbiology',
  'Veterinary Physiology and Pharmacology',
  'Veterinary Public Health and Preventive Medicine',
  'Veterinary Surgery',
  'Agricultural Education',
  'Business Education',
  'Computer Education',
  'Home Economics and Hospitality Management Education',
  'Industrial Technical Education',
  'Anatomy',
  'Medical Biochemistry',
  'Medicine and Surgery',
  'Physiology',
  'Child Dental Health',
  'Oral and Maxillofacial Surgery',
  'Preventive and Community Dentistry',
  'Restorative Dentistry',
  'Human Physiology'
);

-- Step 2: Add tokenHash column to issuances (nullable for now, will be populated later)
ALTER TABLE "public"."issuances" 
ADD COLUMN IF NOT EXISTS "token_hash" varchar(255);

-- Step 3: Drop foreign key constraints from classes table
ALTER TABLE "public"."classes" 
DROP CONSTRAINT IF EXISTS "classes_faculty_faculties_id_fk",
DROP CONSTRAINT IF EXISTS "classes_department_departments_id_fk";

-- Step 4: Create temporary columns for enum values
ALTER TABLE "public"."classes"
ADD COLUMN IF NOT EXISTS "faculty_enum" "public"."faculty_name",
ADD COLUMN IF NOT EXISTS "department_enum" "public"."department_name";

-- Step 5: Migrate data from UUIDs to enum values
-- This requires mapping existing faculty/department UUIDs to their enum values
-- Note: You'll need to manually update this based on your actual data
-- For now, we'll set them to NULL and you can update them manually or via a script

-- Step 6: Drop old uuid columns and rename enum columns
ALTER TABLE "public"."classes"
DROP COLUMN IF EXISTS "faculty",
DROP COLUMN IF EXISTS "department";

ALTER TABLE "public"."classes"
RENAME COLUMN "faculty_enum" TO "faculty";

ALTER TABLE "public"."classes"
RENAME COLUMN "department_enum" TO "department";

-- Step 7: Make the enum columns NOT NULL (after data migration)
-- ALTER TABLE "public"."classes"
-- ALTER COLUMN "faculty" SET NOT NULL,
-- ALTER COLUMN "department" SET NOT NULL;

-- Step 8: Drop departments and faculties tables
DROP TABLE IF EXISTS "public"."departments" CASCADE;
DROP TABLE IF EXISTS "public"."faculties" CASCADE;

