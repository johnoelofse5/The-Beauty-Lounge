-- Migration: Add google_calendar_event_id column to appointments table
-- Date: 2024
-- Description: Store Google Calendar event ID for appointments to enable future updates and deletions

-- Add google_calendar_event_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN google_calendar_event_id VARCHAR(255);

-- Add index for efficient querying by Google Calendar event ID
CREATE INDEX idx_appointments_google_calendar_event_id ON appointments (google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN appointments.google_calendar_event_id IS 'Google Calendar event ID for this appointment, used for updates and deletions';

-- Migration completed successfully
SELECT 'Migration 073_add_google_calendar_event_id.sql completed successfully' as result;

