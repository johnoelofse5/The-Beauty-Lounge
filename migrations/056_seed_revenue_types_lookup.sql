-- Migration: Seed revenue types lookup
-- Date: $(date)
-- Description: Add revenue types as lookup data for financial transaction categories

-- Insert revenue types lookup type
INSERT INTO public.lookup_type (name, lookup_type_code, is_active, is_deleted) 
SELECT 'REVENUE_TYPES', 'REVENUE_TYPES', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.lookup_type lt 
  WHERE lt.lookup_type_code = 'REVENUE_TYPES'
);

-- Insert revenue type lookup values
INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Service Revenue',
  'service_revenue',
  true,
  false,
  1
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Service Revenue'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Inventory Purchase',
  'inventory_purchase',
  true,
  false,
  2
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Inventory Purchase'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Rent',
  'rent',
  true,
  false,
  3
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Rent'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Utilities',
  'utilities',
  true,
  false,
  4
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Utilities'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Marketing',
  'marketing',
  true,
  false,
  5
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Marketing'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Equipment',
  'equipment',
  true,
  false,
  6
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Equipment'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Other',
  'other',
  true,
  false,
  7
FROM public.lookup_type lt 
WHERE lt.name = 'REVENUE_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Other'
);

-- Add comment
COMMENT ON TABLE public.lookup IS 'Lookup data including payment methods and revenue types for financial transactions';
