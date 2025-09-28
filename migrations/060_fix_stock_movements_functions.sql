-- Migration: Fix stock movements functions to remove created_by references
-- Date: $(date)
-- Description: Update database functions to not reference created_by field

-- Drop the existing function first (it has different parameters)
DROP FUNCTION IF EXISTS process_service_inventory_consumption(UUID, UUID, UUID);

-- Create the process_service_inventory_consumption function without created_by
CREATE OR REPLACE FUNCTION process_service_inventory_consumption(
    p_service_id UUID,
    p_appointment_id UUID
) RETURNS TABLE(
    inventory_item_id UUID,
    item_name TEXT,
    quantity_consumed INTEGER,
    remaining_stock INTEGER,
    is_low_stock BOOLEAN
) AS $$
DECLARE
    relationship_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    is_low_stock_flag BOOLEAN;
BEGIN
    -- Loop through all service-inventory relationships for this service
    FOR relationship_record IN
        SELECT 
            sir.inventory_item_id,
            sir.quantity_used,
            ii.name as item_name,
            ii.current_stock,
            ii.minimum_stock
        FROM public.service_inventory_relationships sir
        JOIN public.inventory_items ii ON sir.inventory_item_id = ii.id
        WHERE sir.service_id = p_service_id
        AND sir.is_active = true
        AND sir.is_deleted = false
        AND ii.is_active = true
        AND ii.is_deleted = false
    LOOP
        -- Check if we have enough stock
        IF relationship_record.current_stock >= relationship_record.quantity_used THEN
            -- Calculate new stock level
            new_stock := relationship_record.current_stock - relationship_record.quantity_used;
            
            -- Check if this will result in low stock
            is_low_stock_flag := new_stock <= relationship_record.minimum_stock;
            
            -- Update the inventory item
            UPDATE public.inventory_items 
            SET 
                current_stock = new_stock,
                updated_at = NOW()
            WHERE id = relationship_record.inventory_item_id;
            
            -- Create stock movement record
            INSERT INTO public.stock_movements (
                item_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                relationship_record.inventory_item_id,
                'sale',
                -relationship_record.quantity_used, -- Negative quantity for consumption
                p_appointment_id,
                'appointment',
                'Automatic stock reduction for service booking'
            );
            
            -- Return the result
            inventory_item_id := relationship_record.inventory_item_id;
            item_name := relationship_record.item_name;
            quantity_consumed := relationship_record.quantity_used;
            remaining_stock := new_stock;
            is_low_stock := is_low_stock_flag;
            RETURN NEXT;
            
        ELSE
            -- Not enough stock - log this as an issue
            INSERT INTO public.stock_movements (
                item_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                relationship_record.inventory_item_id,
                'adjustment',
                0,
                p_appointment_id,
                'appointment',
                'INSUFFICIENT STOCK: Service booking could not consume required inventory'
            );
            
            -- Return the insufficient stock result
            inventory_item_id := relationship_record.inventory_item_id;
            item_name := relationship_record.item_name;
            quantity_consumed := 0;
            remaining_stock := relationship_record.current_stock;
            is_low_stock := true;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS trigger_appointment_inventory_reduction ON public.appointments;
DROP FUNCTION IF EXISTS trigger_reduce_inventory_on_appointment();

-- Create the trigger function without created_by references
CREATE OR REPLACE FUNCTION trigger_reduce_inventory_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
    consumption_result RECORD;
    low_stock_items TEXT[] := '{}';
BEGIN
    -- Only process if this is a new appointment (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Process inventory consumption for this service
        FOR consumption_result IN
            SELECT * FROM process_service_inventory_consumption(
                NEW.service_id,
                NEW.id
            )
        LOOP
            -- Collect low stock items
            IF consumption_result.is_low_stock THEN
                low_stock_items := array_append(
                    low_stock_items, 
                    consumption_result.item_name || ' (remaining: ' || consumption_result.remaining_stock || ')'
                );
            END IF;
        END LOOP;
        
        -- Log low stock warning if any items are now low
        IF array_length(low_stock_items, 1) > 0 THEN
            INSERT INTO public.stock_movements (
                item_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                NULL, -- No specific item for this log entry
                'adjustment',
                0,
                NEW.id,
                'appointment',
                'LOW STOCK WARNING: ' || array_to_string(low_stock_items, ', ')
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_appointment_inventory_reduction
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_reduce_inventory_on_appointment();

-- Add comments
COMMENT ON FUNCTION process_service_inventory_consumption IS 'Automatically reduces inventory levels when a service is booked (no user tracking)';
COMMENT ON FUNCTION trigger_reduce_inventory_on_appointment IS 'Automatically reduces inventory when appointments are created (no user tracking)';
COMMENT ON TRIGGER trigger_appointment_inventory_reduction ON public.appointments IS 'Automatically reduces inventory when appointments are created (no user tracking)';
