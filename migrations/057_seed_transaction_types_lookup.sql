-- Migration: Seed transaction types lookup
-- Date: $(date)
-- Description: Add transaction types as lookup data for financial transaction types

-- Insert transaction types lookup type
INSERT INTO public.lookup_type (name, lookup_type_code, is_active, is_deleted) 
SELECT 'TRANSACTION_TYPES', 'TRANSACTION_TYPES', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.lookup_type lt 
  WHERE lt.lookup_type_code = 'TRANSACTION_TYPES'
);

-- Insert transaction type lookup values
INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Income',
  'income',
  true,
  false,
  1
FROM public.lookup_type lt 
WHERE lt.name = 'TRANSACTION_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Income'
);

INSERT INTO public.lookup (lookup_type_id, value, secondary_value, is_active, is_deleted, display_order) 
SELECT 
  lt.id,
  'Expense',
  'expense',
  true,
  false,
  2
FROM public.lookup_type lt 
WHERE lt.name = 'TRANSACTION_TYPES'
AND NOT EXISTS (
  SELECT 1 FROM public.lookup l 
  WHERE l.lookup_type_id = lt.id AND l.value = 'Expense'
);

-- Add comment
COMMENT ON TABLE public.lookup IS 'Lookup data including payment methods, revenue types, and transaction types for financial transactions';
