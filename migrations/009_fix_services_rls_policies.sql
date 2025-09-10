-- Migration: Fix services table RLS policies
-- Date: $(date)
-- Description: Add INSERT, UPDATE, and DELETE policies for services table to allow admin operations

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

-- Create comprehensive RLS policies for services table

-- Allow anyone to view active services
CREATE POLICY "Anyone can view active services" 
  ON public.services FOR select 
  USING (is_active = true AND is_deleted = false);

-- Allow authenticated users to insert services (for admin operations)
CREATE POLICY "Authenticated users can insert services" 
  ON public.services FOR insert 
  WITH CHECK (auth.role() = 'authenticated' AND is_active = true AND is_deleted = false);

-- Allow authenticated users to update services (for admin operations)
CREATE POLICY "Authenticated users can update services" 
  ON public.services FOR update 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete services (soft delete for admin operations)
CREATE POLICY "Authenticated users can delete services" 
  ON public.services FOR update 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Also add policies for service_categories table to allow admin operations
DROP POLICY IF EXISTS "Anyone can view active service categories" ON public.service_categories;

-- Allow anyone to view active service categories
CREATE POLICY "Anyone can view active service categories" 
  ON public.service_categories FOR select 
  USING (is_active = true AND is_deleted = false);

-- Allow authenticated users to insert service categories (for admin operations)
CREATE POLICY "Authenticated users can insert service categories" 
  ON public.service_categories FOR insert 
  WITH CHECK (auth.role() = 'authenticated' AND is_active = true AND is_deleted = false);

-- Allow authenticated users to update service categories (for admin operations)
CREATE POLICY "Authenticated users can update service categories" 
  ON public.service_categories FOR update 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete service categories (soft delete for admin operations)
CREATE POLICY "Authenticated users can delete service categories" 
  ON public.service_categories FOR update 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add comments to document the policies
COMMENT ON POLICY "Authenticated users can insert services" ON public.services IS 'Allows authenticated users to create new services';
COMMENT ON POLICY "Authenticated users can update services" ON public.services IS 'Allows authenticated users to update existing services';
COMMENT ON POLICY "Authenticated users can delete services" ON public.services IS 'Allows authenticated users to soft delete services';
