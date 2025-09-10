-- Migration: Sample services with prices
-- Date: $(date)
-- Description: Insert sample services with prices for testing

-- Clear any existing sample data first (optional)
-- DELETE FROM public.services WHERE name IN ('Haircut', 'Hair Wash & Blowdry', 'Hair Color', 'Highlights', 'Manicure', 'Pedicure', 'Facial', 'Eyebrow Shaping');

-- Insert sample services with prices
INSERT INTO public.services (name, description, duration_minutes, price, is_active, is_deleted) 
VALUES
  (
    'Haircut', 
    'Professional haircut and styling with consultation', 
    45, 
    50.00, 
    true, 
    false
  ),
  (
    'Hair Wash & Blowdry', 
    'Shampoo, condition, and professional blowdry styling', 
    30, 
    35.00, 
    true, 
    false
  ),
  (
    'Hair Color', 
    'Full hair coloring service with premium products', 
    120, 
    120.00, 
    true, 
    false
  ),
  (
    'Highlights', 
    'Partial highlights to brighten your look', 
    90, 
    95.00, 
    true, 
    false
  ),
  (
    'Manicure', 
    'Professional nail care with polish application', 
    45, 
    40.00, 
    true, 
    false
  ),
  (
    'Pedicure', 
    'Relaxing foot care treatment with nail polish', 
    60, 
    50.00, 
    true, 
    false
  ),
  (
    'Facial', 
    'Deep cleansing facial treatment for all skin types', 
    75, 
    85.00, 
    true, 
    false
  ),
  (
    'Eyebrow Shaping', 
    'Professional eyebrow threading and shaping', 
    20, 
    25.00, 
    true, 
    false
  ),
  (
    'Deep Conditioning Treatment', 
    'Intensive hair treatment to restore moisture and shine', 
    45, 
    65.00, 
    true, 
    false
  ),
  (
    'Makeup Application', 
    'Professional makeup application for special events', 
    60, 
    75.00, 
    true, 
    false
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  is_deleted = EXCLUDED.is_deleted,
  updated_at = now();

-- Verify the data was inserted
SELECT 
  name,
  price,
  duration_minutes,
  is_active,
  is_deleted
FROM public.services 
WHERE is_active = true AND is_deleted = false
ORDER BY name;

-- Migration completed successfully
SELECT 'Migration 002_sample_services_with_prices.sql completed successfully' as result; 