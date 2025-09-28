-- Create SMS logs table to track appointment SMS notifications
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    sms_type VARCHAR(50) NOT NULL DEFAULT 'confirmation', -- 'confirmation', 'reschedule', 'cancellation', 'reminder'
    client_phone TEXT,
    practitioner_phone TEXT,
    client_sms_sent BOOLEAN DEFAULT FALSE,
    practitioner_sms_sent BOOLEAN DEFAULT FALSE,
    client_sms_error TEXT,
    practitioner_sms_error TEXT,
    appointment_date TEXT, -- Store the appointment date for this SMS
    appointment_time TEXT, -- Store the appointment time for this SMS
    service_names TEXT, -- Store service names for this SMS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_appointment_id ON sms_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_appointment_type ON sms_logs(appointment_id, sms_type);

-- Add unique constraint to prevent duplicate SMS for same appointment and type
-- (This allows multiple SMS of different types but prevents duplicates of same type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_logs_unique_appointment_type 
ON sms_logs(appointment_id, sms_type) 
WHERE sms_type IN ('confirmation', 'reschedule', 'cancellation');

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SMS logs" ON sms_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = sms_logs.appointment_id
            AND (
                a.user_id = auth.uid() OR 
                a.practitioner_id = auth.uid()
            )
        )
    );

-- Allow service role to insert SMS logs
CREATE POLICY "Service role can insert SMS logs" ON sms_logs
    FOR INSERT WITH CHECK (true);

-- Allow service role to update SMS logs
CREATE POLICY "Service role can update SMS logs" ON sms_logs
    FOR UPDATE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sms_logs_updated_at
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_logs_updated_at();
