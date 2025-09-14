-- Migration: Create portfolio table for practitioner work images
-- Date: $(date)
-- Description: Create portfolio table to store practitioner work images with metadata

-- Create portfolio table
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  image_path text NOT NULL, -- Path in Supabase storage
  category text, -- e.g., 'hair', 'nails', 'makeup', 'skincare'
  tags text[], -- Array of tags for filtering
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_practitioner ON public.portfolio (practitioner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_active_deleted ON public.portfolio (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_portfolio_category ON public.portfolio (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON public.portfolio (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_portfolio_created_at ON public.portfolio (created_at DESC);

-- Create RLS policies for portfolio
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- Practitioners can manage their own portfolio
CREATE POLICY "Practitioners can manage own portfolio" 
  ON public.portfolio FOR ALL 
  USING (practitioner_id = auth.uid() AND is_active = true AND is_deleted = false);

-- Anyone logged in can view active portfolio items
CREATE POLICY "Logged in users can view portfolio" 
  ON public.portfolio FOR SELECT 
  USING (is_active = true AND is_deleted = false);

-- Super admins can manage all portfolio items
CREATE POLICY "Super admins can manage all portfolio" 
  ON public.portfolio FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() 
      AND r.name = 'super_admin' 
      AND u.is_active = true 
      AND u.is_deleted = false
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON public.portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_updated_at();

-- Create storage bucket for portfolio images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for portfolio images
CREATE POLICY "Portfolio images are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'portfolio-images');

-- Practitioners can upload their own portfolio images
CREATE POLICY "Practitioners can upload portfolio images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'portfolio-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Practitioners can update their own portfolio images
CREATE POLICY "Practitioners can update own portfolio images" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'portfolio-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Practitioners can delete their own portfolio images
CREATE POLICY "Practitioners can delete own portfolio images" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'portfolio-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Super admins can manage all portfolio images
CREATE POLICY "Super admins can manage all portfolio images" 
  ON storage.objects FOR ALL 
  USING (
    bucket_id = 'portfolio-images' 
    AND EXISTS (
      SELECT 1 FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() 
      AND r.name = 'super_admin' 
      AND u.is_active = true 
      AND u.is_deleted = false
    )
  );
