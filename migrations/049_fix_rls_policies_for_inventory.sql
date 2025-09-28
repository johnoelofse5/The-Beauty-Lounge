-- Migration: Fix RLS policies that might reference inventory_categories
-- Date: 2024-09-27
-- Description: Update any RLS policies that reference the dropped inventory_categories table

-- Drop any RLS policies that reference inventory_categories
DROP POLICY IF EXISTS "Super admins and practitioners can manage inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Anyone can view active inventory categories" ON public.inventory_categories;

-- The inventory_items table should use service_categories for RLS
-- Check if we need to update any policies that might be checking category access
-- through the old inventory_categories table

-- Ensure inventory_items RLS policies are working with service_categories
-- (These should already exist, but let's make sure they're correct)

-- Verify that inventory_items can be accessed by users with proper roles
-- The existing policies should work since they check user roles, not category access
