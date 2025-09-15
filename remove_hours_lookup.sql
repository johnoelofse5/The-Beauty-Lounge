-- SQL Script: Remove Hours lookup data
-- Description: Drop all hours (00-24) from the lookup table

-- First, get the lookup type ID for HOURS
DO $$
DECLARE
    hours_type_id UUID;
BEGIN
    -- Get the ID of the hours lookup type
    SELECT id INTO hours_type_id FROM public.lookup_type WHERE lookup_type_code = 'HOURS';
    
    -- If the lookup type exists, delete all its lookup records
    IF hours_type_id IS NOT NULL THEN
        -- Delete all lookup records for hours
        DELETE FROM public.lookup WHERE lookup_type_id = hours_type_id;
        
        -- Optionally, delete the lookup type itself
        DELETE FROM public.lookup_type WHERE id = hours_type_id;
        
        RAISE NOTICE 'Successfully deleted hours lookup data and lookup type';
    ELSE
        RAISE NOTICE 'Hours lookup type not found';
    END IF;
END $$;

-- Alternative: If you want to keep the lookup type but just clear the data
-- DELETE FROM public.lookup WHERE lookup_type_id = (SELECT id FROM public.lookup_type WHERE lookup_type_code = 'HOURS');
