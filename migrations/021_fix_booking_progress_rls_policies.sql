-- Fix RLS policies for booking_progress table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can create their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can update their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Users can delete their own booking progress" ON booking_progress;
DROP POLICY IF EXISTS "Practitioners can view booking progress for their appointments" ON booking_progress;
DROP POLICY IF EXISTS "Super admins can view all booking progress" ON booking_progress;

-- Recreate policies with better error handling
-- Users can view their own booking progress
CREATE POLICY "Users can view their own booking progress" ON booking_progress
  FOR SELECT USING (
    auth.uid()::text = user_id::text AND is_active = true AND is_deleted = false
  );

-- Users can create their own booking progress
CREATE POLICY "Users can create their own booking progress" ON booking_progress
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
  );

-- Users can update their own booking progress
CREATE POLICY "Users can update their own booking progress" ON booking_progress
  FOR UPDATE USING (
    auth.uid()::text = user_id::text AND is_active = true AND is_deleted = false
  ) WITH CHECK (
    auth.uid()::text = user_id::text
  );

-- Users can delete their own booking progress
CREATE POLICY "Users can delete their own booking progress" ON booking_progress
  FOR DELETE USING (
    auth.uid()::text = user_id::text AND is_active = true AND is_deleted = false
  );

-- Practitioners can view booking progress for their appointments
CREATE POLICY "Practitioners can view booking progress for their appointments" ON booking_progress
  FOR SELECT USING (
    auth.uid()::text = practitioner_id::text AND is_active = true AND is_deleted = false
  );

-- Super admins can view all booking progress
CREATE POLICY "Super admins can view all booking progress" ON booking_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id::text = auth.uid()::text 
        AND r.name = 'super_admin'
        AND u.is_active = true
        AND u.is_deleted = false
    ) AND is_active = true AND is_deleted = false
  );

-- Add comment
COMMENT ON TABLE booking_progress IS 'Stores user progress through the booking process - RLS policies updated';
