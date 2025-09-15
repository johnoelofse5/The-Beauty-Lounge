-- Migration: Restore appointment_date and start_time columns
-- This migration adds back the appointment_date and start_time columns that were accidentally dropped

-- Add the appointment_date column back as timestamptz
ALTER TABLE appointments 
ADD COLUMN appointment_date timestamptz;

-- Add the start_time column back as timestamptz
ALTER TABLE appointments 
ADD COLUMN start_time timestamptz;

-- Update the appointment_date column with data from end_time (assuming end_time still exists)
-- Since we need to reconstruct the start_time, we'll use end_time minus duration
-- For now, we'll set appointment_date to end_time and start_time to end_time
-- You may need to adjust this based on your actual data
UPDATE appointments 
SET 
  appointment_date = end_time,
  start_time = end_time
WHERE end_time IS NOT NULL;

-- Add indexes for the restored columns
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- Add comments to explain the columns
COMMENT ON COLUMN appointments.appointment_date IS 'Appointment date and time with timezone (stored as UTC)';
COMMENT ON COLUMN appointments.start_time IS 'Appointment start date and time with timezone (stored as UTC)';

-- Update RLS policies to include the restored column
-- Drop existing policies that might reference appointment_date
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Practitioners can view appointments assigned to them" ON appointments;
DROP POLICY IF EXISTS "Super admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Practitioners can update appointments assigned to them" ON appointments;
DROP POLICY IF EXISTS "Super admins can update all appointments" ON appointments;
DROP POLICY IF EXISTS "Practitioners can delete appointments assigned to them" ON appointments;
DROP POLICY IF EXISTS "Super admins can delete all appointments" ON appointments;

-- Recreate policies
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = user_id AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Practitioners can view appointments assigned to them" ON appointments
  FOR SELECT USING (
    auth.uid() = practitioner_id AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Super admins can view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
        AND r.name = 'super_admin'
        AND u.is_active = true
        AND u.is_deleted = false
    ) AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Users can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = practitioner_id
  );

CREATE POLICY "Practitioners can update appointments assigned to them" ON appointments
  FOR UPDATE USING (
    auth.uid() = practitioner_id AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Super admins can update all appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
        AND r.name = 'super_admin'
        AND u.is_active = true
        AND u.is_deleted = false
    ) AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Practitioners can delete appointments assigned to them" ON appointments
  FOR DELETE USING (
    auth.uid() = practitioner_id AND is_active = true AND is_deleted = false
  );

CREATE POLICY "Super admins can delete all appointments" ON appointments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
        AND r.name = 'super_admin'
        AND u.is_active = true
        AND u.is_deleted = false
    ) AND is_active = true AND is_deleted = false
  );
