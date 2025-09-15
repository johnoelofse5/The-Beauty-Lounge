-- Migration: Copy data from datetime columns to restored columns
-- This migration copies data from appointment_datetime to appointment_date
-- and from start_datetime to start_time

-- Copy appointment_datetime data to appointment_date column
UPDATE appointments 
SET appointment_date = appointment_datetime
WHERE appointment_datetime IS NOT NULL;

-- Copy start_datetime data to start_time column
UPDATE appointments 
SET start_time = start_datetime
WHERE start_datetime IS NOT NULL;

-- Verify the data was copied correctly
-- You can run these queries to check:
-- SELECT COUNT(*) as total_appointments FROM appointments;
-- SELECT COUNT(*) as appointments_with_date FROM appointments WHERE appointment_date IS NOT NULL;
-- SELECT COUNT(*) as appointments_with_start_time FROM appointments WHERE start_time IS NOT NULL;
-- SELECT COUNT(*) as appointments_with_datetime FROM appointments WHERE appointment_datetime IS NOT NULL;
-- SELECT COUNT(*) as appointments_with_start_datetime FROM appointments WHERE start_datetime IS NOT NULL;
