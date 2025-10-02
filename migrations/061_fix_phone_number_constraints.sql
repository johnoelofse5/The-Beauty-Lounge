-- Migration: Fix phone number constraints and normalization
-- Date: $(date)
-- Description: Add unique constraint to phone column and create phone normalization function

-- Create function to normalize phone numbers (remove spaces, dashes, etc.)
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return NULL if input is NULL or empty
    IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove all non-digit characters and normalize
    RETURN REGEXP_REPLACE(TRIM(phone_input), '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- First, let's check if there are any duplicate phone numbers and handle them
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicate phone numbers
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT normalize_phone_number(phone) as normalized_phone, COUNT(*) as cnt
        FROM users 
        WHERE phone IS NOT NULL AND TRIM(phone) != ''
        GROUP BY normalize_phone_number(phone)
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If there are duplicates, we need to handle them
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate phone numbers. Marking older duplicates as deleted.', duplicate_count;
        
        -- Mark older duplicate entries as deleted (keep the most recent one)
        UPDATE users SET is_deleted = true
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY normalize_phone_number(phone) 
                           ORDER BY created_at DESC
                       ) as rn
                FROM users 
                WHERE phone IS NOT NULL 
                AND TRIM(phone) != ''
                AND is_deleted = false
            ) ranked
            WHERE rn > 1
        );
    END IF;
END $$;

-- Add a normalized phone column for better indexing and uniqueness
ALTER TABLE users ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

-- Update all existing records with normalized phone numbers
UPDATE users 
SET normalized_phone = normalize_phone_number(phone)
WHERE phone IS NOT NULL;

-- Create unique index on normalized phone numbers (excluding deleted users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_normalized_phone_unique 
ON users (normalized_phone) 
WHERE normalized_phone IS NOT NULL 
AND is_deleted = false 
AND is_active = true;

-- Create trigger to automatically update normalized_phone when phone is updated
CREATE OR REPLACE FUNCTION update_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_phone = normalize_phone_number(NEW.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_normalized_phone ON users;
CREATE TRIGGER trigger_update_normalized_phone
    BEFORE INSERT OR UPDATE OF phone ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_normalized_phone();

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_normalized_phone ON users (normalized_phone) 
WHERE normalized_phone IS NOT NULL;

-- Add comment to explain the normalized_phone column
COMMENT ON COLUMN users.normalized_phone IS 'Phone number with all non-digit characters removed for consistent lookups';
