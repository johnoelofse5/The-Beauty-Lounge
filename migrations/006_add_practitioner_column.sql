-- Migration: Add is_practitioner column to users table
-- This allows identifying which users are practitioners

-- Add is_practitioner column to users table
ALTER TABLE users 
ADD COLUMN is_practitioner BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of practitioners
CREATE INDEX idx_users_is_practitioner ON users (is_practitioner) WHERE is_practitioner = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN users.is_practitioner IS 'Indicates if this user is a practitioner who can provide services';

-- Example queries for practitioners:
-- Get all practitioners:
-- SELECT * FROM users WHERE is_practitioner = TRUE AND is_active = TRUE AND is_deleted = FALSE;

-- Get practitioner count:
-- SELECT COUNT(*) FROM users WHERE is_practitioner = TRUE AND is_active = TRUE AND is_deleted = FALSE;

-- Update existing users to be practitioners (if needed):
-- UPDATE users SET is_practitioner = TRUE WHERE email IN ('practitioner@example.com');
