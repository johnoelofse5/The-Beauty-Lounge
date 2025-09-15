-- Migration: Seed Days of the Week lookup data
-- Date: $(date)
-- Description: Add days of the week to the lookup system

-- Insert Days of the Week lookup type
INSERT INTO public.lookup_type (name, lookup_type_code, description) VALUES
('Days of the Week', 'DAYS_OF_WEEK', 'Standard days of the week for scheduling and calendar management')
ON CONFLICT (lookup_type_code) DO NOTHING;

-- Get the ID of the days of the week lookup type
DO $$
DECLARE
    days_type_id UUID;
BEGIN
    SELECT id INTO days_type_id FROM public.lookup_type WHERE lookup_type_code = 'DAYS_OF_WEEK';
    
    -- Insert days of the week with proper order (Monday = 1, Sunday = 7)
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (days_type_id, '1', 'Monday', 1),
    (days_type_id, '2', 'Tuesday', 2),
    (days_type_id, '3', 'Wednesday', 3),
    (days_type_id, '4', 'Thursday', 4),
    (days_type_id, '5', 'Friday', 5),
    (days_type_id, '6', 'Saturday', 6),
    (days_type_id, '7', 'Sunday', 7)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Insert additional useful lookup types for future use
INSERT INTO public.lookup_type (name, lookup_type_code, description) VALUES
('Service Categories', 'SERVICE_CATEGORIES', 'Categories for organizing services'),
('Appointment Status', 'APPOINTMENT_STATUS', 'Status values for appointments (scheduled, confirmed, completed, cancelled)'),
('User Status', 'USER_STATUS', 'Status values for user accounts (active, inactive, suspended)'),
('Payment Methods', 'PAYMENT_METHODS', 'Available payment methods for appointments'),
('Payment Status', 'PAYMENT_STATUS', 'Status values for payments (pending, completed, failed, refunded)'),
('Notification Types', 'NOTIFICATION_TYPES', 'Types of notifications that can be sent'),
('Yes/No Options', 'YES_NO', 'Simple yes/no options for various fields'),
('Priority Levels', 'PRIORITY_LEVELS', 'Priority levels for various entities (low, medium, high, urgent)')
ON CONFLICT (lookup_type_code) DO NOTHING;

-- Seed Yes/No lookup data
DO $$
DECLARE
    yes_no_type_id UUID;
BEGIN
    SELECT id INTO yes_no_type_id FROM public.lookup_type WHERE lookup_type_code = 'YES_NO';
    
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (yes_no_type_id, 'true', 'Yes', 1),
    (yes_no_type_id, 'false', 'No', 2)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Seed Priority Levels lookup data
DO $$
DECLARE
    priority_type_id UUID;
BEGIN
    SELECT id INTO priority_type_id FROM public.lookup_type WHERE lookup_type_code = 'PRIORITY_LEVELS';
    
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (priority_type_id, 'low', 'Low Priority', 1),
    (priority_type_id, 'medium', 'Medium Priority', 2),
    (priority_type_id, 'high', 'High Priority', 3),
    (priority_type_id, 'urgent', 'Urgent', 4)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Seed Appointment Status lookup data
DO $$
DECLARE
    appointment_status_type_id UUID;
BEGIN
    SELECT id INTO appointment_status_type_id FROM public.lookup_type WHERE lookup_type_code = 'APPOINTMENT_STATUS';
    
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (appointment_status_type_id, 'scheduled', 'Scheduled', 1),
    (appointment_status_type_id, 'confirmed', 'Confirmed', 2),
    (appointment_status_type_id, 'in_progress', 'In Progress', 3),
    (appointment_status_type_id, 'completed', 'Completed', 4),
    (appointment_status_type_id, 'cancelled', 'Cancelled', 5),
    (appointment_status_type_id, 'no_show', 'No Show', 6),
    (appointment_status_type_id, 'rescheduled', 'Rescheduled', 7)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Seed Payment Methods lookup data
DO $$
DECLARE
    payment_methods_type_id UUID;
BEGIN
    SELECT id INTO payment_methods_type_id FROM public.lookup_type WHERE lookup_type_code = 'PAYMENT_METHODS';
    
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (payment_methods_type_id, 'cash', 'Cash', 1),
    (payment_methods_type_id, 'card', 'Credit/Debit Card', 2),
    (payment_methods_type_id, 'bank_transfer', 'Bank Transfer', 3),
    (payment_methods_type_id, 'online', 'Online Payment', 4),
    (payment_methods_type_id, 'insurance', 'Insurance', 5)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Seed Payment Status lookup data
DO $$
DECLARE
    payment_status_type_id UUID;
BEGIN
    SELECT id INTO payment_status_type_id FROM public.lookup_type WHERE lookup_type_code = 'PAYMENT_STATUS';
    
    INSERT INTO public.lookup (lookup_type_id, value, secondary_value, display_order) VALUES
    (payment_status_type_id, 'pending', 'Pending', 1),
    (payment_status_type_id, 'completed', 'Completed', 2),
    (payment_status_type_id, 'failed', 'Failed', 3),
    (payment_status_type_id, 'refunded', 'Refunded', 4),
    (payment_status_type_id, 'partial', 'Partial Payment', 5)
    ON CONFLICT (lookup_type_id, value) DO NOTHING;
END $$;

-- Example queries to verify the data:
-- Get all days of the week:
-- SELECT l.value, l.secondary_value FROM lookup l 
-- JOIN lookup_type lt ON l.lookup_type_id = lt.id 
-- WHERE lt.lookup_type_code = 'DAYS_OF_WEEK' 
-- AND l.is_active = TRUE AND l.is_deleted = FALSE 
-- ORDER BY l.display_order;

-- Get all lookup types:
-- SELECT * FROM lookup_type WHERE is_active = TRUE AND is_deleted = FALSE ORDER BY name;
