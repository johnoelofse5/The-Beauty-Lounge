-- Simple fix for booking_progress RLS policies
-- This can be run directly in the Supabase SQL editor

-- First, let's check what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'booking_progress';

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can create their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can update their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can delete their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Practitioners can view booking progress for their appointments" ON booking_progress;
DROP POLICY IF EXISTS "Super admins can view all booking progress" ON booking_progress;

-- Create simpler, more permissive policies
-- Users can do everything with their own booking progress
CREATE POLICY "Users can manage their own booking progress" ON booking_progress
  FOR ALL USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- Practitioners can view booking progress for their appointments
CREATE POLICY "Practitioners can view booking progress for their appointments" ON booking_progress
  FOR SELECT USING (
    auth.uid() = practitioner_id
  );

-- Super admins can do everything
CREATE POLICY "Super admins can manage all booking progress" ON booking_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
        AND r.name = 'super_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
        AND r.name = 'super_admin'
    )
  );
