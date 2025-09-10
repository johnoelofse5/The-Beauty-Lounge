-- Migration: Add service categories
-- Date: $(date)
-- Description: Create service_categories table and add category relationship to services

-- Create service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  display_order integer DEFAULT 0,
  icon text, -- Optional icon name or emoji for UI
  color text DEFAULT '#6366f1', -- Hex color for category styling
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add category_id to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_categories_active_deleted ON public.service_categories (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_service_categories_display_order ON public.service_categories (display_order) WHERE is_active = true AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services (category_id);

-- Enable RLS on service_categories table
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories (public read for active categories)
CREATE POLICY "Anyone can view active service categories" 
  ON public.service_categories FOR select 
  USING (is_active = true AND is_deleted = false);

-- Add updated_at trigger to service_categories
CREATE TRIGGER service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert the predefined categories
INSERT INTO public.service_categories (name, description, display_order, is_active, is_deleted) 
VALUES
  (
    'Massage', 
    'Relaxing and therapeutic massage services', 
    1,
    true, 
    false
  ),
  (
    'Nail Services', 
    'Professional nail care and styling', 
    2,
    true, 
    false
  ),
  (
    'Waxing', 
    'Hair removal and waxing services', 
    3,
    true, 
    false
  ),
  (
    'Tinting', 
    'Eyebrow and eyelash tinting services', 
    4,
    true, 
    false
  ),
  (
    'Lash Services', 
    'Eyelash extensions and treatments', 
    5,
    true, 
    false
  ),
  (
    'Facial Services', 
    'Skin care and facial treatments', 
    6,
    true, 
    false
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active,
  is_deleted = EXCLUDED.is_deleted,
  updated_at = now();

-- Clear existing sample services and insert the real services
DELETE FROM public.services WHERE name IN ('Haircut', 'Hair Wash & Blowdry', 'Hair Color', 'Highlights', 'Manicure', 'Pedicure', 'Facial', 'Eyebrow Shaping', 'Deep Conditioning Treatment', 'Makeup Application');

-- Insert all services with their proper categories
DO $$
DECLARE
  massage_id uuid;
  nail_id uuid;
  facial_id uuid;
  lash_id uuid;
  tinting_id uuid;
  waxing_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO massage_id FROM public.service_categories WHERE name = 'Massage';
  SELECT id INTO nail_id FROM public.service_categories WHERE name = 'Nail Services';
  SELECT id INTO facial_id FROM public.service_categories WHERE name = 'Facial Services';
  SELECT id INTO lash_id FROM public.service_categories WHERE name = 'Lash Services';
  SELECT id INTO tinting_id FROM public.service_categories WHERE name = 'Tinting';
  SELECT id INTO waxing_id FROM public.service_categories WHERE name = 'Waxing';

  -- Insert Massage services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('30 Minute back, neck and shoulder', 'Relaxing 30 minute massage targeting back, neck and shoulders', 30, 220.00, massage_id, true, false),
    ('45 minute back, neck and shoulder', 'Extended 45 minute massage for back, neck and shoulders', 45, 280.00, massage_id, true, false),
    ('30 minute Indian head massage', 'Traditional Indian head massage for relaxation and stress relief', 30, 220.00, massage_id, true, false),
    ('30 minute foot and calf massage', 'Soothing massage for feet and calves', 30, 220.00, massage_id, true, false);

  -- Insert Nail Services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('Gel Overlay', 'Professional gel overlay application for natural nails', 120, 220.00, nail_id, true, false),
    ('Gel Overlay with tips', 'Gel overlay with nail tips for added length', 120, 250.00, nail_id, true, false),
    ('Gel overlay toes', 'Gel overlay application for toenails', 60, 200.00, nail_id, true, false),
    ('Gel fill', 'Maintenance fill for existing gel nails', 120, 190.00, nail_id, true, false),
    ('Soak off', 'Professional removal of gel polish or extensions', 45, 70.00, nail_id, true, false);

  -- Insert Waxing services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('Brow', 'Eyebrow shaping and waxing', 15, 50.00, waxing_id, true, false),
    ('Lip', 'Upper lip waxing', 15, 50.00, waxing_id, true, false),
    ('Chin', 'Chin area waxing', 15, 50.00, waxing_id, true, false),
    ('Full face', 'Complete facial waxing service', 30, 120.00, waxing_id, true, false),
    ('Underarm', 'Underarm waxing', 30, 100.00, waxing_id, true, false),
    ('Bikini', 'Bikini line waxing', 30, 120.00, waxing_id, true, false),
    ('Brazilian', 'Brazilian waxing service', 45, 200.00, waxing_id, true, false),
    ('Hollywood', 'Complete intimate area waxing', 45, 220.00, waxing_id, true, false),
    ('Half leg', 'Lower leg waxing', 30, 140.00, waxing_id, true, false),
    ('Full leg', 'Complete leg waxing', 45, 200.00, waxing_id, true, false);

  -- Insert Tinting services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('Lash', 'Professional eyelash tinting', 45, 50.00, tinting_id, true, false),
    ('Brows', 'Professional eyebrow tinting', 45, 50.00, tinting_id, true, false);

  -- Insert Lash Services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('Classic lashes', 'Classic individual eyelash extensions', 120, 280.00, lash_id, true, false),
    ('2 week fill', 'Classic lash fill after 2 weeks', 90, 180.00, lash_id, true, false),
    ('3 week fill', 'Classic lash fill after 3 weeks', 90, 200.00, lash_id, true, false),
    ('Hybrid lashes', 'Hybrid lash extension application', 120, 350.00, lash_id, true, false),
    ('Hybrid lash 2 week fill', 'Hybrid lash fill after 2 weeks', 90, 200.00, lash_id, true, false),
    ('Hybrid 3 week fill', 'Hybrid lash fill after 3 weeks', 90, 250.00, lash_id, true, false),
    ('Lash lift and tint', 'Lash lift treatment with tinting', 120, 200.00, lash_id, true, false);

  -- Insert Facial Services
  INSERT INTO public.services (name, description, duration_minutes, price, category_id, is_active, is_deleted) VALUES
    ('Dermaplaning', 'Professional dermaplaning facial treatment', 60, 220.00, facial_id, true, false);

END $$;

-- Create a view for services with category information
CREATE OR REPLACE VIEW public.services_with_categories AS
SELECT 
  s.*,
  sc.name as category_name,
  sc.description as category_description,
  sc.display_order as category_display_order,
  sc.icon as category_icon,
  sc.color as category_color
FROM public.services s
LEFT JOIN public.service_categories sc ON s.category_id = sc.id
WHERE s.is_active = true AND s.is_deleted = false
  AND (sc.is_active = true AND sc.is_deleted = false OR sc.id IS NULL)
ORDER BY sc.display_order ASC, s.name ASC;

-- Grant access to the view
GRANT SELECT ON public.services_with_categories TO authenticated, anon;

-- Add comments to document the new table and columns
COMMENT ON TABLE public.service_categories IS 'Categories for organizing services (Massage, Nail Services, etc.)';
COMMENT ON COLUMN public.service_categories.name IS 'Category name (e.g., Massage, Nail Services)';
COMMENT ON COLUMN public.service_categories.display_order IS 'Order for displaying categories (lower numbers first)';
COMMENT ON COLUMN public.service_categories.icon IS 'Icon or emoji for the category';
COMMENT ON COLUMN public.service_categories.color IS 'Hex color code for category styling';
COMMENT ON COLUMN public.services.category_id IS 'Foreign key to service_categories table';

-- Verify the data
SELECT 
  sc.name as category,
  sc.display_order,
  COUNT(s.id) as service_count
FROM public.service_categories sc
LEFT JOIN public.services s ON sc.id = s.category_id AND s.is_active = true AND s.is_deleted = false
WHERE sc.is_active = true AND sc.is_deleted = false
GROUP BY sc.id, sc.name, sc.display_order
ORDER BY sc.display_order;

-- Migration completed successfully
SELECT 'Migration 003_add_service_categories.sql completed successfully' as result; 