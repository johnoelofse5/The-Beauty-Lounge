-- Migration: Fix inventory_items to use service_categories instead of inventory_categories
-- Date: 2024-09-27
-- Description: Update foreign key constraint to reference service_categories table

-- First, drop the existing foreign key constraint
ALTER TABLE public.inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_category_id_fkey;

-- Add new foreign key constraint to reference service_categories
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.service_categories(id);

-- Drop the inventory_categories table since we don't need it
DROP TABLE IF EXISTS public.inventory_categories CASCADE;
