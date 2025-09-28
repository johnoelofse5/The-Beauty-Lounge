-- Create service_inventory_relationships table
CREATE TABLE IF NOT EXISTS public.service_inventory_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL DEFAULT 1 CHECK (quantity_used > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique combination of service and inventory item
    UNIQUE(service_id, inventory_item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_inventory_relationships_service_id 
    ON public.service_inventory_relationships(service_id);
CREATE INDEX IF NOT EXISTS idx_service_inventory_relationships_inventory_item_id 
    ON public.service_inventory_relationships(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_service_inventory_relationships_active 
    ON public.service_inventory_relationships(is_active, is_deleted);

-- Enable RLS
ALTER TABLE public.service_inventory_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view service inventory relationships" ON public.service_inventory_relationships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can insert service inventory relationships" ON public.service_inventory_relationships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can update service inventory relationships" ON public.service_inventory_relationships
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can delete service inventory relationships" ON public.service_inventory_relationships
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_inventory_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_service_inventory_relationships_updated_at
    BEFORE UPDATE ON public.service_inventory_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_service_inventory_relationships_updated_at();

-- Add comment
COMMENT ON TABLE public.service_inventory_relationships IS 'Tracks which inventory items are used by which services and in what quantities';
