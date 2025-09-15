-- Migration: Create booking_progress table for saving booking progress
-- This table stores the user's progress through the booking process

CREATE TABLE booking_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  selected_services JSONB,
  selected_practitioner_id UUID REFERENCES users(id),
  selected_client_id UUID REFERENCES users(id),
  selected_date DATE,
  selected_time VARCHAR(10),
  notes TEXT,
  is_external_client BOOLEAN DEFAULT FALSE,
  external_client_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX idx_booking_progress_user_id ON booking_progress(user_id);
CREATE INDEX idx_booking_progress_practitioner_id ON booking_progress(practitioner_id);
CREATE INDEX idx_booking_progress_expires_at ON booking_progress(expires_at);
CREATE INDEX idx_booking_progress_active ON booking_progress(is_active, is_deleted);

-- Add RLS policies
ALTER TABLE booking_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own booking progress
CREATE POLICY "Users can view their own booking progress" ON booking_progress
  FOR SELECT USING (
    auth.uid() = user_id AND is_active = true AND is_deleted = false
  );

-- Users can create their own booking progress
CREATE POLICY "Users can create their own booking progress" ON booking_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update their own booking progress
CREATE POLICY "Users can update their own booking progress" ON booking_progress
  FOR UPDATE USING (
    auth.uid() = user_id AND is_active = true AND is_deleted = false
  );

-- Users can delete their own booking progress
CREATE POLICY "Users can delete their own booking progress" ON booking_progress
  FOR DELETE USING (
    auth.uid() = user_id AND is_active = true AND is_deleted = false
  );

-- Practitioners can view booking progress for their appointments
CREATE POLICY "Practitioners can view booking progress for their appointments" ON booking_progress
  FOR SELECT USING (
    auth.uid() = practitioner_id AND is_active = true AND is_deleted = false
  );

-- Super admins can view all booking progress
CREATE POLICY "Super admins can view all booking progress" ON booking_progress
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

-- Add comments
COMMENT ON TABLE booking_progress IS 'Stores user progress through the booking process';
COMMENT ON COLUMN booking_progress.current_step IS 'Current step in the booking process (1-4)';
COMMENT ON COLUMN booking_progress.selected_services IS 'JSON array of selected service IDs';
COMMENT ON COLUMN booking_progress.external_client_info IS 'JSON object with external client details';
COMMENT ON COLUMN booking_progress.expires_at IS 'When the booking progress expires (default 7 days)';
