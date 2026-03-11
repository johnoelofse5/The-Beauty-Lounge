ALTER TABLE sms_logs
ADD COLUMN suppressed boolean DEFAULT false,
ADD COLUMN suppression_reason text;

ALTER TABLE sms_logs 
ADD COLUMN status text DEFAULT 'sent',
ADD COLUMN reason text;

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins/super_admins can do everything
CREATE POLICY "admins can manage sms_logs"
ON sms_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('super_admin', 'admin')
  )
);

-- Practitioners can read logs for their own appointments
CREATE POLICY "practitioners can read own appointment sms_logs"
ON sms_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = sms_logs.appointment_id
    AND appointments.practitioner_id = auth.uid()
  )
);

-- Clients can read logs for their own appointments
CREATE POLICY "clients can read own appointment sms_logs"
ON sms_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = sms_logs.appointment_id
    AND appointments.client_id = auth.uid()
  )
);

ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS schedule_date timestamptz;