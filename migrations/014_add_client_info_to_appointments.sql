-- Migration: Add client information fields to appointments table
-- Date: $(date)
-- Description: Allow practitioners to book appointments for clients who are not registered users

-- Add client information fields to appointments table
ALTER TABLE appointments 
ADD COLUMN client_first_name VARCHAR(100),
ADD COLUMN client_last_name VARCHAR(100),
ADD COLUMN client_email VARCHAR(255),
ADD COLUMN client_phone VARCHAR(20),
ADD COLUMN is_external_client BOOLEAN DEFAULT FALSE;

-- Make user_id nullable to allow external clients
ALTER TABLE appointments 
ALTER COLUMN user_id DROP NOT NULL;

-- Add indexes for efficient querying by client information
CREATE INDEX idx_appointments_client_email ON appointments (client_email) WHERE client_email IS NOT NULL;
CREATE INDEX idx_appointments_client_phone ON appointments (client_phone) WHERE client_phone IS NOT NULL;
CREATE INDEX idx_appointments_external_client ON appointments (is_external_client);

-- Add comments explaining the new columns
COMMENT ON COLUMN appointments.client_first_name IS 'First name of client (for non-registered clients)';
COMMENT ON COLUMN appointments.client_last_name IS 'Last name of client (for non-registered clients)';
COMMENT ON COLUMN appointments.client_email IS 'Email of client (for non-registered clients)';
COMMENT ON COLUMN appointments.client_phone IS 'Phone number of client (for non-registered clients)';
COMMENT ON COLUMN appointments.is_external_client IS 'True if this appointment is for a client who is not a registered user';

-- Update RLS policies to allow practitioners to create appointments with client info
-- Drop existing practitioner appointment creation policy
DROP POLICY IF EXISTS "Practitioners can create appointments for clients" ON public.appointments;

-- Create new policy that allows practitioners to create appointments with client info
CREATE POLICY "Practitioners can create appointments for clients" 
  ON public.appointments FOR insert 
  WITH CHECK (
    -- Allow if the current user is a practitioner and is assigned as the practitioner
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
    -- Either user_id is set (for registered clients) OR client info is provided (for external clients)
    AND (
      user_id IS NOT NULL 
      OR (
        is_external_client = true 
        AND client_first_name IS NOT NULL 
        AND client_last_name IS NOT NULL 
        AND (client_email IS NOT NULL OR client_phone IS NOT NULL)
      )
    )
  );

-- Update RLS policy for practitioners to view appointments with client info
DROP POLICY IF EXISTS "Practitioners can view assigned appointments" ON public.appointments;

CREATE POLICY "Practitioners can view assigned appointments" 
  ON public.appointments FOR select 
  USING (
    -- Allow if the current user is a practitioner and is assigned to this appointment
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  );

-- Update RLS policy for practitioners to update appointments with client info
DROP POLICY IF EXISTS "Practitioners can update assigned appointments" ON public.appointments;

CREATE POLICY "Practitioners can update assigned appointments" 
  ON public.appointments FOR update 
  USING (
    -- Allow if the current user is a practitioner and is assigned to this appointment
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  );

-- Add RLS policy for super admins to view all appointments including external clients
CREATE POLICY "Super admins can view all appointments" 
  ON public.appointments FOR select 
  USING (
    -- Allow if the current user is a super admin
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'super_admin'
      AND u.is_active = true 
      AND u.is_deleted = false
    )
    AND is_active = true 
    AND is_deleted = false
  );

-- Example queries for the new structure:
-- Get appointments for external clients:
-- SELECT * FROM appointments WHERE is_external_client = true AND is_active = true AND is_deleted = false;

-- Get appointments by client email:
-- SELECT * FROM appointments WHERE client_email = 'client@example.com' AND is_active = true AND is_deleted = false;

-- Get appointments by client phone:
-- SELECT * FROM appointments WHERE client_phone = '+1234567890' AND is_active = true AND is_deleted = false;

-- Get all appointments for a practitioner (both registered and external clients):
-- SELECT * FROM appointments WHERE practitioner_id = 'practitioner-uuid' AND is_active = true AND is_deleted = false;

-- Migration completed successfully
SELECT 'Migration 014_add_client_info_to_appointments.sql completed successfully' as result;
