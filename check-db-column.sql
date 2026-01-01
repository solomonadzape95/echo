-- Check if class_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'voters' 
AND column_name IN ('class', 'class_id');
