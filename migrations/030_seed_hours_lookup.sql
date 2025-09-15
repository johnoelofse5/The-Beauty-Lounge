-- Migration: Seed Hours lookup data
-- Date: $(date)
-- Description: Add hours (00-24) to the lookup system for time pickers

-- Insert Hours lookup type
INSERT INTO public.lookup_type (name, lookup_type_code, description) VALUES
('Hours', 'HOURS', 'Hours of the day from 00 to 24 for time selection')
ON CONFLICT (lookup_type_code) DO NOTHING;

-- Get the ID of the hours lookup type and seed hours data
DO $$
DECLARE
    hours_type_id UUID;
    hour_value TEXT;
    hour_display TEXT;
    i INTEGER;
BEGIN
    SELECT id INTO hours_type_id FROM public.lookup_type WHERE lookup_type_code = 'HOURS';
    
    -- Insert hours from 00 to 23 (24 hours total)
    FOR i IN 0..23 LOOP
        -- Format hour as two digits (00, 01, 02, etc.)
        hour_value := LPAD(i::TEXT, 2, '0');
        
        -- Create display text
        IF i = 0 THEN
            hour_display := '12:00 AM (Midnight)';
        ELSIF i < 12 THEN
            hour_display := hour_value || ':00 AM';
        ELSIF i = 12 THEN
            hour_display := '12:00 PM (Noon)';
        ELSE
            hour_display := LPAD((i - 12)::TEXT, 2, '0') || ':00 PM';
        END IF;
        
        -- Insert the hour record
        INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
        (hours_type_id, hour_value, hour_display, i + 1)
        ON CONFLICT (lookup_type_id, value) DO NOTHING;
    END LOOP;
END $$;

-- Example query to verify the data:
-- SELECT l.value, l.secondary_value FROM lookup l 
-- JOIN lookup_type lt ON l.lookup_type_id = lt.id 
-- WHERE lt.lookup_type_code = 'HOURS' 
-- AND l.is_active = TRUE AND l.is_deleted = FALSE 
-- ORDER BY l.display_order;
