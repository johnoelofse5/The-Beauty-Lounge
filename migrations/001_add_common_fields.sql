-- Migration: Add common fields to all tables
-- Date: $(date)
-- Description: Add is_active, is_deleted columns to all tables and price column to services table

-- Add columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add columns to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS price decimal(10,2),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add columns to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_active_deleted ON public.users (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_services_active_deleted ON public.services (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_appointments_active_deleted ON public.appointments (is_active, is_deleted);

-- Add index for services price
CREATE INDEX IF NOT EXISTS idx_services_price ON public.services (price) WHERE price IS NOT NULL;

-- Update RLS policies to consider active/deleted status
-- Drop existing policies and recreate them with active/deleted filters

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own active profile" 
  ON public.users FOR select 
  USING (auth.uid() = id AND is_active = true AND is_deleted = false);

CREATE POLICY "Users can update own active profile" 
  ON public.users FOR update 
  USING (auth.uid() = id AND is_active = true AND is_deleted = false);

CREATE POLICY "Users can insert own profile" 
  ON public.users FOR insert 
  WITH CHECK (auth.uid() = id AND is_active = true AND is_deleted = false);

-- Services policies
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

CREATE POLICY "Anyone can view active services" 
  ON public.services FOR select 
  USING (is_active = true AND is_deleted = false);

-- Appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

CREATE POLICY "Users can view own active appointments" 
  ON public.appointments FOR select 
  USING (auth.uid() = user_id AND is_active = true AND is_deleted = false);

CREATE POLICY "Users can create own appointments" 
  ON public.appointments FOR insert 
  WITH CHECK (auth.uid() = user_id AND is_active = true AND is_deleted = false);

CREATE POLICY "Users can update own active appointments" 
  ON public.appointments FOR update 
  USING (auth.uid() = user_id AND is_active = true AND is_deleted = false);

-- Soft delete policy - users can "delete" (mark as deleted) their own appointments
CREATE POLICY "Users can soft delete own appointments" 
  ON public.appointments FOR update 
  USING (auth.uid() = user_id AND is_active = true)
  WITH CHECK (auth.uid() = user_id);

-- Create helper functions for soft delete operations
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.users 
  SET is_deleted = true, is_active = false, updated_at = now()
  WHERE id = user_uuid AND auth.uid() = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.soft_delete_appointment(appointment_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.appointments 
  SET is_deleted = true, is_active = false, updated_at = now()
  WHERE id = appointment_uuid 
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore soft-deleted records
CREATE OR REPLACE FUNCTION public.restore_appointment(appointment_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.appointments 
  SET is_deleted = false, is_active = true, updated_at = now()
  WHERE id = appointment_uuid 
  AND user_id = auth.uid()
  AND is_deleted = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing records to have default values
UPDATE public.users SET is_active = true, is_deleted = false WHERE is_active IS NULL OR is_deleted IS NULL;
UPDATE public.services SET is_active = true, is_deleted = false WHERE is_active IS NULL OR is_deleted IS NULL;
UPDATE public.appointments SET is_active = true, is_deleted = false WHERE is_active IS NULL OR is_deleted IS NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN public.users.is_active IS 'Indicates if the user account is active';
COMMENT ON COLUMN public.users.is_deleted IS 'Soft delete flag - true if user is deleted';
COMMENT ON COLUMN public.services.price IS 'Service price in USD';
COMMENT ON COLUMN public.services.is_active IS 'Indicates if the service is currently offered';
COMMENT ON COLUMN public.services.is_deleted IS 'Soft delete flag - true if service is deleted';
COMMENT ON COLUMN public.appointments.is_active IS 'Indicates if the appointment is active';
COMMENT ON COLUMN public.appointments.is_deleted IS 'Soft delete flag - true if appointment is cancelled/deleted';

-- Migration completed successfully
SELECT 'Migration 001_add_common_fields.sql completed successfully' as result; 