-- Migration: Clean up all references to dropped inventory_categories table
-- Date: 2024-09-27
-- Description: Ensure all foreign key constraints and references are updated

-- First, check if the old foreign key constraint still exists and drop it
DO $$
BEGIN
    -- Drop the old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_category_id_fkey' 
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE public.inventory_items 
        DROP CONSTRAINT inventory_items_category_id_fkey;
    END IF;
END $$;

-- Add the new foreign key constraint to service_categories
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.service_categories(id);

-- Ensure the inventory_categories table is completely dropped
DROP TABLE IF EXISTS public.inventory_categories CASCADE;

-- Add comment to confirm the relationship
COMMENT ON COLUMN public.inventory_items.category_id IS 'References service_categories.id - inventory items are categorized using service categories';
