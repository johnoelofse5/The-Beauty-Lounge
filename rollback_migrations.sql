-- Rollback Script: Execute migrations 063 and 064 to rollback 061 and 062
-- Run this script to undo the phone normalization and debug logging changes

-- First, rollback migration 062 (debug logging)
\i migrations/063_rollback_migration_062.sql

-- Then, rollback migration 061 (phone normalization) - handles case where it may not exist
\i migrations/064_rollback_migration_061.sql

-- Verify the rollback
SELECT 
    'Users table columns:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY column_name;

-- Check if debug_logs table exists (should be dropped)
SELECT 
    'Debug logs table exists:' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debug_logs' AND table_schema = 'public') 
        THEN 'YES - ROLLBACK FAILED' 
        ELSE 'NO - ROLLBACK SUCCESS' 
    END as status;

-- Check if normalized_phone column exists (should be dropped)
SELECT 
    'Normalized phone column exists:' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'normalized_phone') 
        THEN 'YES - ROLLBACK FAILED' 
        ELSE 'NO - ROLLBACK SUCCESS' 
    END as status;
