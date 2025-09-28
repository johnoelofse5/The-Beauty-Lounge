-- Migration: Add service_id column to inventory_items table
-- Date: 2024-09-27
-- Description: Add optional service_id column to link inventory items to services

-- Add service_id column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);

-- Add index for efficient querying by service
CREATE INDEX IF NOT EXISTS idx_inventory_items_service_id 
ON public.inventory_items (service_id) 
WHERE service_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.inventory_items.service_id IS 'Optional link to services table - indicates which service this inventory item is used for';
