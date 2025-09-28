-- Migration: Seed payment methods lookup
-- Date: $(date)
-- Description: Add payment methods as lookup data

-- Insert payment methods lookup type
INSERT INTO public.lookup_type (name, lookup_type_code, is_active, is_deleted) 
SELECT 'PAYMENT_METHODS', 'PAYMENT_METHODS', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.lookup_type lt 
  WHERE lt.lookup_type_code = 'PAYMENT_METHODS'
);

-- Insert payment method lookup values
INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Cash',
  'cash',
  true,
  false,
  1
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Cash'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Card',
  'card',
  true,
  false,
  2
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Card'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Bank Transfer',
  'bank_transfer',
  true,
  false,
  3
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Bank Transfer'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'EFT',
  'eft',
  true,
  false,
  4
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'EFT'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Cheque',
  'cheque',
  true,
  false,
  5
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Cheque'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Other',
  'other',
  true,
  false,
  6
FROM public.lookup_type lt 
WHERE lt.name = 'PAYMENT_METHODS'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Other'
);

-- Add comment
COMMENT ON TABLE public.lookup IS 'Lookup data including payment methods for financial transactions';
