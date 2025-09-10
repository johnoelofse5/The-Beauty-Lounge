-- Migration: Update appointments table to support both service_id and service_ids
-- This handles the transition from single service to multiple services

-- First, make service_id nullable since we're moving to service_ids
ALTER TABLE appointments 
ALTER COLUMN service_id DROP NOT NULL;

-- Update existing appointments to have empty service_ids array if they don't have one
UPDATE appointments 
SET service_ids = '[]'::jsonb 
WHERE service_ids IS NULL;

-- For existing appointments that have a service_id but no service_ids, migrate the data
UPDATE appointments 
SET service_ids = jsonb_build_array(service_id)
WHERE service_id IS NOT NULL 
  AND (service_ids IS NULL OR service_ids = '[]'::jsonb);

-- Make service_ids NOT NULL
ALTER TABLE appointments 
ALTER COLUMN service_ids SET NOT NULL;

-- Add comment explaining the transition
COMMENT ON COLUMN appointments.service_id IS 'Legacy single service ID - kept for backward compatibility, use service_ids instead';
COMMENT ON COLUMN appointments.service_ids IS 'Array of service IDs for this appointment, stored as JSONB for efficient querying';

-- Example queries for the new structure:
-- Get appointments with specific services:
-- SELECT * FROM appointments WHERE service_ids @> '["service-uuid-1"]'::jsonb;
-- SELECT * FROM appointments WHERE service_ids ? 'service-uuid-1';

-- Get appointments with multiple specific services:
-- SELECT * FROM appointments WHERE service_ids @> '["service-uuid-1", "service-uuid-2"]'::jsonb;

-- Count appointments by service:
-- SELECT service_id, COUNT(*) FROM appointments, jsonb_array_elements_text(service_ids) AS service_id GROUP BY service_id;
