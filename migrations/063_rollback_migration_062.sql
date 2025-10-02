-- Rollback Migration: Remove debug logging functionality
-- Date: $(date)
-- Description: Rollback migration 062 - remove debug logging tables and functions

-- Drop debug logging functions
DROP FUNCTION IF EXISTS public.cleanup_debug_logs();
DROP FUNCTION IF EXISTS public.log_user_creation_error(VARCHAR(50), TEXT, JSONB);
DROP FUNCTION IF EXISTS public.log_user_creation_success(VARCHAR(50), UUID);
DROP FUNCTION IF EXISTS public.log_user_creation_attempt(VARCHAR(50), JSONB);
DROP FUNCTION IF EXISTS public.verify_otp_with_logging(VARCHAR(20), VARCHAR(6), VARCHAR(50));
DROP FUNCTION IF EXISTS public.log_debug(VARCHAR(100), VARCHAR(50), UUID, JSONB, TEXT);

-- Drop debug logs view
DROP VIEW IF EXISTS public.debug_logs_summary;

-- Drop debug logs table
DROP TABLE IF EXISTS public.debug_logs;

-- Drop indexes that were created for debug logs
DROP INDEX IF EXISTS idx_debug_logs_operation;
DROP INDEX IF EXISTS idx_debug_logs_phone;
DROP INDEX IF EXISTS idx_debug_logs_created_at;
