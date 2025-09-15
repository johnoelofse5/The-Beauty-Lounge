-- Migration: Create LookupType and Lookup tables
-- Date: $(date)
-- Description: Create lookup tables for managing reference data with hierarchical relationship

-- Create LookupType table
CREATE TABLE IF NOT EXISTS public.lookup_type (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lookup_type_code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Lookup table
CREATE TABLE IF NOT EXISTS public.lookup (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lookup_type_id UUID NOT NULL REFERENCES public.lookup_type(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    secondary_value VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of lookup_type_id and value
    CONSTRAINT unique_lookup_value_per_type UNIQUE (lookup_type_id, value)
);

-- Create indexes for efficient querying
CREATE INDEX idx_lookup_type_code ON public.lookup_type (lookup_type_code) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_lookup_type_active ON public.lookup_type (is_active, is_deleted);
CREATE INDEX idx_lookup_type_id ON public.lookup (lookup_type_id) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_lookup_active ON public.lookup (is_active, is_deleted);
CREATE INDEX idx_lookup_display_order ON public.lookup (lookup_type_id, display_order) WHERE is_active = TRUE AND is_deleted = FALSE;

-- Add comments
COMMENT ON TABLE public.lookup_type IS 'Master table for lookup types (e.g., Time Intervals, Service Categories, etc.)';
COMMENT ON COLUMN public.lookup_type.name IS 'Human-readable name of the lookup type';
COMMENT ON COLUMN public.lookup_type.lookup_type_code IS 'Unique code identifier for the lookup type';
COMMENT ON COLUMN public.lookup_type.description IS 'Optional description of what this lookup type represents';

COMMENT ON TABLE public.lookup IS 'Individual lookup values belonging to a lookup type';
COMMENT ON COLUMN public.lookup.lookup_type_id IS 'Foreign key reference to lookup_type table';
COMMENT ON COLUMN public.lookup.value IS 'Primary value of the lookup item';
COMMENT ON COLUMN public.lookup.secondary_value IS 'Optional secondary value (e.g., description, code, etc.)';
COMMENT ON COLUMN public.lookup.display_order IS 'Order for displaying lookup items in UI';

-- Enable RLS
ALTER TABLE public.lookup_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lookup_type

-- Everyone can view active lookup types
CREATE POLICY "Anyone can view active lookup types" 
    ON public.lookup_type FOR SELECT 
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Super admins can manage all lookup types
CREATE POLICY "Super admins can manage all lookup types" 
    ON public.lookup_type FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    );

-- RLS Policies for lookup

-- Everyone can view active lookups
CREATE POLICY "Anyone can view active lookups" 
    ON public.lookup FOR SELECT 
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Super admins can manage all lookups
CREATE POLICY "Super admins can manage all lookups" 
    ON public.lookup FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    );

-- Create functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lookup_type_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_lookup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_update_lookup_type_updated_at
    BEFORE UPDATE ON public.lookup_type
    FOR EACH ROW
    EXECUTE FUNCTION update_lookup_type_updated_at();

CREATE TRIGGER trigger_update_lookup_updated_at
    BEFORE UPDATE ON public.lookup
    FOR EACH ROW
    EXECUTE FUNCTION update_lookup_updated_at();

-- Insert sample data for time slot intervals
INSERT INTO public.lookup_type (name, lookup_type_code, description) VALUES
('Time Slot Intervals', 'TIME_SLOT_INTERVALS', 'Available time slot intervals for appointment booking');

-- Get the ID of the time slot intervals lookup type
DO $$
DECLARE
    time_interval_type_id UUID;
BEGIN
    SELECT id INTO time_interval_type_id FROM public.lookup_type WHERE lookup_type_code = 'TIME_SLOT_INTERVALS';
    
    -- Insert time slot interval options
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (time_interval_type_id, '15', '15 minutes', 1),
    (time_interval_type_id, '30', '30 minutes', 2),
    (time_interval_type_id, '45', '45 minutes', 3),
    (time_interval_type_id, '60', '60 minutes', 4),
    (time_interval_type_id, '90', '90 minutes', 5),
    (time_interval_type_id, '120', '120 minutes', 6);
END $$;

-- Example queries:
-- Get all time slot intervals:
-- SELECT l.value, l.secondary_value FROM lookup l 
-- JOIN lookup_type lt ON l.lookup_type_id = lt.id 
-- WHERE lt.lookup_type_code = 'TIME_SLOT_INTERVALS' 
-- AND l.is_active = TRUE AND l.is_deleted = FALSE 
-- ORDER BY l.display_order;

-- Get all lookup types:
-- SELECT * FROM lookup_type WHERE is_active = TRUE AND is_deleted = FALSE ORDER BY name;
