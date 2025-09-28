-- Migration: Enhance SMS logs table to track different SMS types and prevent duplicates
-- Date: $(date)
-- Description: Add SMS type tracking, error logging, and appointment details to SMS logs

-- Add new columns to existing sms_logs table
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS sms_type VARCHAR(50) NOT NULL DEFAULT 'confirmation',
ADD COLUMN IF NOT EXISTS client_sms_error TEXT,
ADD COLUMN IF NOT EXISTS practitioner_sms_error TEXT,
ADD COLUMN IF NOT EXISTS appointment_date TEXT,
ADD COLUMN IF NOT EXISTS appointment_time TEXT,
ADD COLUMN IF NOT EXISTS service_names TEXT;

-- Add comment explaining the SMS type column
COMMENT ON COLUMN sms_logs.sms_type IS 'Type of SMS: confirmation, reschedule, cancellation, reminder';

-- Create new indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_appointment_type ON sms_logs(appointment_id, sms_type);

-- Add unique constraint to prevent duplicate SMS for same appointment and type
-- (This allows multiple SMS of different types but prevents duplicates of same type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_logs_unique_appointment_type 
ON sms_logs(appointment_id, sms_type) 
WHERE sms_type IN ('confirmation', 'reschedule', 'cancellation');

-- Update existing records to have the default SMS type
UPDATE sms_logs 
SET sms_type = 'confirmation' 
WHERE sms_type IS NULL OR sms_type = '';

-- Add constraint to ensure SMS type is valid
ALTER TABLE sms_logs 
ADD CONSTRAINT chk_sms_type 
CHECK (sms_type IN ('confirmation', 'reschedule', 'cancellation', 'reminder'));
