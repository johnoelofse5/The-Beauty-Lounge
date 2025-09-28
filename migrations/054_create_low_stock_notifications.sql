-- Migration: Create low stock notification system
-- Date: $(date)
-- Description: Add notification system for low stock alerts

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'low_stock', 'out_of_stock', 'inventory_alert'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data like item_id, service_id, etc.
    is_read BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON public.notifications(is_active, is_deleted);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Create function to send low stock notifications
CREATE OR REPLACE FUNCTION send_low_stock_notification(
    p_item_id UUID,
    p_current_stock INTEGER,
    p_minimum_stock INTEGER,
    p_item_name TEXT
) RETURNS VOID AS $$
DECLARE
    admin_users UUID[];
    user_id UUID;
BEGIN
    -- Get all super_admin and practitioner users
    SELECT ARRAY_AGG(u.id) INTO admin_users
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE r.name IN ('super_admin', 'practitioner')
    AND u.is_active = true
    AND u.is_deleted = false;
    
    -- Send notification to each admin/practitioner
    FOREACH user_id IN ARRAY admin_users
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            user_id,
            'low_stock',
            'Low Stock Alert',
            p_item_name || ' is running low. Current stock: ' || p_current_stock || ', Minimum required: ' || p_minimum_stock,
            jsonb_build_object(
                'item_id', p_item_id,
                'item_name', p_item_name,
                'current_stock', p_current_stock,
                'minimum_stock', p_minimum_stock,
                'alert_type', 'low_stock'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to send out of stock notifications
CREATE OR REPLACE FUNCTION send_out_of_stock_notification(
    p_item_id UUID,
    p_item_name TEXT
) RETURNS VOID AS $$
DECLARE
    admin_users UUID[];
    user_id UUID;
BEGIN
    -- Get all super_admin and practitioner users
    SELECT ARRAY_AGG(u.id) INTO admin_users
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE r.name IN ('super_admin', 'practitioner')
    AND u.is_active = true
    AND u.is_deleted = false;
    
    -- Send notification to each admin/practitioner
    FOREACH user_id IN ARRAY admin_users
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            user_id,
            'out_of_stock',
            'Out of Stock Alert',
            p_item_name || ' is now out of stock and needs to be reordered immediately.',
            jsonb_build_object(
                'item_id', p_item_id,
                'item_name', p_item_name,
                'alert_type', 'out_of_stock'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the inventory consumption function to send notifications
CREATE OR REPLACE FUNCTION process_service_inventory_consumption(
    p_service_id UUID,
    p_appointment_id UUID,
    p_created_by UUID DEFAULT NULL
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
    item_name TEXT;
    minimum_stock INTEGER;
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
        -- Store values for notification
        item_name := relationship_record.item_name;
        minimum_stock := relationship_record.minimum_stock;
        
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
                updated_at = NOW(),
                updated_by = p_created_by
            WHERE id = relationship_record.inventory_item_id;
            
            -- Create stock movement record
            INSERT INTO public.stock_movements (
                item_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes,
                created_by
            ) VALUES (
                relationship_record.inventory_item_id,
                'sale',
                -relationship_record.quantity_used, -- Negative quantity for consumption
                p_appointment_id,
                'appointment',
                'Automatic stock reduction for service booking',
                p_created_by
            );
            
            -- Send notifications if needed
            IF new_stock = 0 THEN
                PERFORM send_out_of_stock_notification(
                    relationship_record.inventory_item_id,
                    item_name
                );
            ELSIF is_low_stock_flag THEN
                PERFORM send_low_stock_notification(
                    relationship_record.inventory_item_id,
                    new_stock,
                    minimum_stock,
                    item_name
                );
            END IF;
            
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
                notes,
                created_by
            ) VALUES (
                relationship_record.inventory_item_id,
                'adjustment',
                0,
                p_appointment_id,
                'appointment',
                'INSUFFICIENT STOCK: Service booking could not consume required inventory',
                p_created_by
            );
            
            -- Send urgent notification about insufficient stock
            PERFORM send_out_of_stock_notification(
                relationship_record.inventory_item_id,
                item_name
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

-- Create function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE(
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    is_read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.created_at
    FROM public.notifications n
    WHERE n.user_id = p_user_id
    AND n.is_active = true
    AND n.is_deleted = false
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = true, updated_at = NOW()
    WHERE id = p_notification_id 
    AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE public.notifications IS 'System notifications for users including low stock alerts';
COMMENT ON FUNCTION send_low_stock_notification IS 'Sends low stock notifications to all admin users';
COMMENT ON FUNCTION send_out_of_stock_notification IS 'Sends out of stock notifications to all admin users';
COMMENT ON FUNCTION get_user_notifications IS 'Retrieves notifications for a specific user';
COMMENT ON FUNCTION mark_notification_read IS 'Marks a notification as read for a specific user';
