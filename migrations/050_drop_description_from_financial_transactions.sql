-- Drop description column from financial_transactions table
-- This migration removes the description column as it's no longer needed

-- Drop the description column
ALTER TABLE public.financial_transactions 
DROP COLUMN IF EXISTS description;

-- Add a comment to document the change
COMMENT ON TABLE public.financial_transactions IS 'Financial transactions table without description column - removed in migration 050';
