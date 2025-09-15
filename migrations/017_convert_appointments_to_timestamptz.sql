-- Migration: Convert existing appointment columns to timestamptz
-- This migration converts appointment_date, start_time, and end_time columns
-- to use timestamptz for proper UTC storage and timezone conversion

-- First, add new timestamptz columns
ALTER TABLE appointments 
ADD COLUMN appointment_datetime_temp timestamptz,
ADD COLUMN start_datetime_temp timestamptz,
ADD COLUMN end_datetime_temp timestamptz;

-- Convert existing data to timestamptz
-- We'll assume existing dates are in local timezone and convert them to UTC
UPDATE appointments 
SET 
  appointment_datetime_temp = (appointment_date || ' ' || COALESCE(start_time, '00:00:00'))::timestamptz,
  start_datetime_temp = (appointment_date || ' ' || COALESCE(start_time, '00:00:00'))::timestamptz,
  end_datetime_temp = (appointment_date || ' ' || COALESCE(end_time, '00:00:00'))::timestamptz
WHERE appointment_date IS NOT NULL;

-- Drop the old columns
ALTER TABLE appointments 
DROP COLUMN appointment_date,
DROP COLUMN start_time,
DROP COLUMN end_time;

-- Rename the new columns to the original names
ALTER TABLE appointments RENAME COLUMN appointment_datetime_temp TO appointment_date;
ALTER TABLE appointments RENAME COLUMN start_datetime_temp TO start_time;
ALTER TABLE appointments RENAME COLUMN end_datetime_temp TO end_time;

-- Update column comments
COMMENT ON COLUMN appointments.appointment_date IS 'Appointment date and time with timezone (stored as UTC)';
COMMENT ON COLUMN appointments.start_time IS 'Appointment start date and time with timezone (stored as UTC)';
COMMENT ON COLUMN appointments.end_time IS 'Appointment end date and time with timezone (stored as UTC)';

-- Update indexes - drop old ones and create new ones
DROP INDEX IF EXISTS idx_appointments_appointment_date;
DROP INDEX IF EXISTS idx_appointments_start_time;
DROP INDEX IF EXISTS idx_appointments_end_time;

CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_end_time ON appointments(end_time);

-- Update RLS policies to work with the new timestamptz columns
-- Drop existing policies
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
