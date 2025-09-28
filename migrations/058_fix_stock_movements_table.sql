-- Migration: Fix stock_movements table structure
-- Date: $(date)
-- Description: Ensure stock_movements table has correct structure without created_by column

-- Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  movement_type VARCHAR(20) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'waste'
  quantity INTEGER NOT NULL, -- positive for in, negative for out
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_id UUID, -- can link to purchase orders, appointments, etc.
  reference_type VARCHAR(50), -- 'purchase_order', 'appointment', 'adjustment'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drop created_by column if it exists (we don't need to track who created stock movements)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.stock_movements 
        DROP COLUMN created_by;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements(reference_id, reference_type);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock_movements
CREATE POLICY "Users can view stock movements" ON public.stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can insert stock movements" ON public.stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can update stock movements" ON public.stock_movements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

CREATE POLICY "Users can delete stock movements" ON public.stock_movements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('super_admin', 'practitioner')
        )
    );

-- Add comment
COMMENT ON TABLE public.stock_movements IS 'Tracks all inventory stock movements including purchases, sales, adjustments, and waste';
COMMENT ON COLUMN public.stock_movements.movement_type IS 'Type of movement: purchase, sale, adjustment, waste';
COMMENT ON COLUMN public.stock_movements.quantity IS 'Quantity moved (positive for in, negative for out)';
COMMENT ON COLUMN public.stock_movements.reference_id IS 'ID of related record (appointment, purchase order, etc.)';
COMMENT ON COLUMN public.stock_movements.reference_type IS 'Type of related record (appointment, purchase_order, etc.)';
