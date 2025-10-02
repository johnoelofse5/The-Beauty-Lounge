-- Rollback Migration: Remove phone number normalization functionality
-- Date: $(date)
-- Description: Rollback migration 061 - remove normalized_phone column and related functionality
-- Note: This migration handles the case where migration 061 may not have been applied

-- Check if normalized_phone column exists before trying to drop it
DO $$ 
BEGIN
    -- Drop the trigger that updates normalized_phone (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_normalized_phone') THEN
        DROP TRIGGER trigger_update_normalized_phone ON users;
    END IF;
    
    -- Drop the function that updates normalized_phone (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_normalized_phone') THEN
        DROP FUNCTION public.update_normalized_phone();
    END IF;
    
    -- Drop indexes (if they exist)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_normalized_phone_unique') THEN
        DROP INDEX idx_users_normalized_phone_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_normalized_phone') THEN
        DROP INDEX idx_users_normalized_phone;
    END IF;
    
    -- Drop the normalize_phone_number function (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'normalize_phone_number') THEN
        DROP FUNCTION public.normalize_phone_number(TEXT);
    END IF;
    
    -- Drop the normalized_phone column (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'normalized_phone') THEN
        ALTER TABLE users DROP COLUMN normalized_phone;
    END IF;
    
    RAISE NOTICE 'Migration 061 rollback completed - normalized_phone functionality removed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration 061 rollback - some elements may not have existed: %', SQLERRM;
END $$;
