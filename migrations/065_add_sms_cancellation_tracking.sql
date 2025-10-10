-- Add cancellation tracking to SMS logs
ALTER TABLE sms_logs 
ADD COLUMN cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN cancellation_reason TEXT;

-- Add index for efficient querying of cancelled SMS
CREATE INDEX idx_sms_logs_cancelled ON sms_logs(cancelled, appointment_id, sms_type);

-- Add comment for documentation
COMMENT ON COLUMN sms_logs.cancelled IS 'Indicates if the scheduled SMS was cancelled';
COMMENT ON COLUMN sms_logs.cancelled_at IS 'Timestamp when the SMS was cancelled';
COMMENT ON COLUMN sms_logs.cancellation_reason IS 'Reason for cancellation (e.g., appointment_modified, appointment_cancelled)';
