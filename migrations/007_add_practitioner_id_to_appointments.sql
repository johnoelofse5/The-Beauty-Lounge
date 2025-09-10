-- Migration: Add practitioner_id column to appointments table
-- This links appointments to specific practitioners

-- Add practitioner_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN practitioner_id UUID REFERENCES users(id);

-- Add index for efficient querying by practitioner
CREATE INDEX idx_appointments_practitioner_id ON appointments (practitioner_id);

-- Add comment explaining the column
COMMENT ON COLUMN appointments.practitioner_id IS 'The practitioner assigned to this appointment';

-- Example queries for practitioner appointments:
-- Get appointments for a specific practitioner:
-- SELECT * FROM appointments WHERE practitioner_id = 'practitioner-uuid' AND is_active = TRUE AND is_deleted = FALSE;

-- Get practitioner's schedule for a date:
-- SELECT * FROM appointments WHERE practitioner_id = 'practitioner-uuid' AND appointment_date = '2024-01-15' AND is_active = TRUE AND is_deleted = FALSE;

-- Get all practitioners with their appointment counts:
-- SELECT u.id, u.first_name, u.last_name, COUNT(a.id) as appointment_count 
-- FROM users u 
-- LEFT JOIN appointments a ON u.id = a.practitioner_id AND a.is_active = TRUE AND a.is_deleted = FALSE
-- WHERE u.is_practitioner = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
-- GROUP BY u.id, u.first_name, u.last_name;
