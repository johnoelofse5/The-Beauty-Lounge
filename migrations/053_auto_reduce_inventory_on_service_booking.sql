-- Migration: Auto-reduce inventory when services are booked
-- Date: $(date)
-- Description: Automatically reduce inventory levels when clients book services

-- Create function to process service inventory consumption
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

-- Create function to check if service can be booked (sufficient inventory)
CREATE OR REPLACE FUNCTION check_service_inventory_availability(
    p_service_id UUID
) RETURNS TABLE(
    can_book BOOLEAN,
    insufficient_items TEXT[]
) AS $$
DECLARE
    relationship_record RECORD;
    insufficient_items_list TEXT[] := '{}';
    can_book_flag BOOLEAN := true;
BEGIN
    -- Check all required inventory items for this service
    FOR relationship_record IN
        SELECT 
            ii.name as item_name,
            ii.current_stock,
            sir.quantity_used
        FROM public.service_inventory_relationships sir
        JOIN public.inventory_items ii ON sir.inventory_item_id = ii.id
        WHERE sir.service_id = p_service_id
        AND sir.is_active = true
        AND sir.is_deleted = false
        AND ii.is_active = true
        AND ii.is_deleted = false
    LOOP
        -- Check if we have enough stock
        IF relationship_record.current_stock < relationship_record.quantity_used THEN
            can_book_flag := false;
            insufficient_items_list := array_append(
                insufficient_items_list, 
                relationship_record.item_name || ' (need ' || relationship_record.quantity_used || ', have ' || relationship_record.current_stock || ')'
            );
        END IF;
    END LOOP;
    
    can_book := can_book_flag;
    insufficient_items := insufficient_items_list;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically reduce inventory when appointment is created
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

-- Create trigger on appointments table
CREATE TRIGGER trigger_appointment_inventory_reduction
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_reduce_inventory_on_appointment();

-- Create function to get service inventory requirements
CREATE OR REPLACE FUNCTION get_service_inventory_requirements(
    p_service_id UUID
) RETURNS TABLE(
    inventory_item_id UUID,
    item_name TEXT,
    quantity_required INTEGER,
    current_stock INTEGER,
    unit_of_measure TEXT,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sir.inventory_item_id,
        ii.name as item_name,
        sir.quantity_used as quantity_required,
        ii.current_stock,
        ii.unit_of_measure,
        (ii.current_stock >= sir.quantity_used) as is_available
    FROM public.service_inventory_relationships sir
    JOIN public.inventory_items ii ON sir.inventory_item_id = ii.id
    WHERE sir.service_id = p_service_id
    AND sir.is_active = true
    AND sir.is_deleted = false
    AND ii.is_active = true
    AND ii.is_deleted = false
    ORDER BY ii.name;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION process_service_inventory_consumption IS 'Automatically reduces inventory levels when a service is booked';
COMMENT ON FUNCTION check_service_inventory_availability IS 'Checks if a service can be booked based on available inventory';
COMMENT ON FUNCTION get_service_inventory_requirements IS 'Returns the inventory requirements for a specific service';
COMMENT ON TRIGGER trigger_appointment_inventory_reduction ON public.appointments IS 'Automatically reduces inventory when appointments are created';
