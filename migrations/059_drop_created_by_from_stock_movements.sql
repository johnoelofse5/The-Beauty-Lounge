-- Migration: Drop created_by column from stock_movements table
-- Date: $(date)
-- Description: Remove created_by column from stock_movements table as it's not needed

-- Drop created_by column from stock_movements table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.stock_movements 
        DROP COLUMN created_by;
    END IF;
END $$;

-- Drop the created_by index if it exists
DROP INDEX IF EXISTS idx_stock_movements_created_by;

-- Add comment
COMMENT ON TABLE public.stock_movements IS 'Tracks all inventory stock movements including purchases, sales, adjustments, and waste (no user tracking)';
