-- Migration: Add service_ids column to appointments table for multiple services
-- This allows storing multiple service IDs as a JSON array

-- Add service_ids column to store array of service IDs
ALTER TABLE appointments 
ADD COLUMN service_ids JSONB DEFAULT '[]'::jsonb;

-- Add index for efficient querying of service_ids
CREATE INDEX idx_appointments_service_ids ON appointments USING GIN (service_ids);

-- Update existing appointments to have empty service_ids array
UPDATE appointments 
SET service_ids = '[]'::jsonb 
WHERE service_ids IS NULL;

-- Make service_ids NOT NULL
ALTER TABLE appointments 
ALTER COLUMN service_ids SET NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN appointments.service_ids IS 'Array of service IDs for this appointment, stored as JSONB for efficient querying';

-- Example of how to query appointments with specific services:
-- SELECT * FROM appointments WHERE service_ids @> '["service-uuid-1", "service-uuid-2"]'::jsonb;
-- SELECT * FROM appointments WHERE service_ids ? 'service-uuid-1';

-- Example of how to add a service to an appointment:
-- UPDATE appointments SET service_ids = service_ids || '["new-service-id"]'::jsonb WHERE id = 'appointment-id';

-- Example of how to remove a service from an appointment:
-- UPDATE appointments SET service_ids = service_ids - 'service-id-to-remove' WHERE id = 'appointment-id';
