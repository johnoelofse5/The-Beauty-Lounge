-- Migration: Seed Measurements Lookup Type and Data
-- Date: 2024-09-27
-- Description: Create MEASUREMENTS lookup type and seed unit of measure values for inventory management

-- Insert MEASUREMENTS lookup type
INSERT INTO public.lookup_type (
    name,
    lookup_type_code,
    description,
    is_active,
    is_deleted
) VALUES (
    'Measurements',
    'MEASUREMENTS',
    'Unit of measure options for inventory items (weight, volume, quantity)',
    TRUE,
    FALSE
) ON CONFLICT (lookup_type_code) DO NOTHING;

-- Get the lookup_type_id for MEASUREMENTS
-- We'll use a variable to store it for the subsequent inserts
DO $$
DECLARE
    measurements_type_id UUID;
BEGIN
    -- Get the lookup type ID
    SELECT id INTO measurements_type_id 
    FROM public.lookup_type 
    WHERE lookup_type_code = 'MEASUREMENTS';
    
    -- Insert measurement lookup values
    INSERT INTO public.lookup (
        lookup_type_id,
        value,
        secondary_value,
        display_order,
        is_active,
        is_deleted
    ) VALUES 
        -- Basic units
        (measurements_type_id, 'unit', 'Unit (pieces)', 1, TRUE, FALSE),
        
        -- Volume measurements
        (measurements_type_id, 'ml', 'Milliliters (ml)', 2, TRUE, FALSE),
        (measurements_type_id, 'l', 'Liters (l)', 3, TRUE, FALSE),
        
        -- Weight measurements
        (measurements_type_id, 'g', 'Grams (g)', 4, TRUE, FALSE),
        (measurements_type_id, 'kg', 'Kilograms (kg)', 5, TRUE, FALSE),
        
        -- Container types
        (measurements_type_id, 'bottle', 'Bottle', 6, TRUE, FALSE),
        (measurements_type_id, 'tube', 'Tube', 7, TRUE, FALSE),
        (measurements_type_id, 'jar', 'Jar', 8, TRUE, FALSE),
        (measurements_type_id, 'can', 'Can', 9, TRUE, FALSE),
        
        -- Packaging units
        (measurements_type_id, 'pack', 'Pack', 10, TRUE, FALSE),
        (measurements_type_id, 'box', 'Box', 11, TRUE, FALSE),
        (measurements_type_id, 'case', 'Case', 12, TRUE, FALSE),
        (measurements_type_id, 'dozen', 'Dozen', 13, TRUE, FALSE),
        
        -- Length measurements (for tools/equipment)
        (measurements_type_id, 'cm', 'Centimeters (cm)', 14, TRUE, FALSE),
        (measurements_type_id, 'm', 'Meters (m)', 15, TRUE, FALSE),
        
        -- Beauty/salon specific units
        (measurements_type_id, 'sheet', 'Sheet', 16, TRUE, FALSE),
        (measurements_type_id, 'roll', 'Roll', 17, TRUE, FALSE),
        (measurements_type_id, 'pair', 'Pair', 18, TRUE, FALSE),
        (measurements_type_id, 'set', 'Set', 19, TRUE, FALSE)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
    
END $$;

-- Create index for efficient querying of measurements
-- Note: We'll create a general index since PostgreSQL doesn't allow subqueries in index predicates
CREATE INDEX IF NOT EXISTS idx_lookup_measurements 
ON public.lookup (lookup_type_id, display_order) 
WHERE is_active = TRUE AND is_deleted = FALSE;

-- Add comment
COMMENT ON TABLE public.lookup IS 'Individual lookup values belonging to a lookup type. Includes measurements for inventory management.';
