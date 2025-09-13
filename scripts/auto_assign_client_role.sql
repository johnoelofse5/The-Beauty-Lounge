-- SQL script to automatically assign client role to new users
-- This creates a trigger that runs when a new user is inserted into the users table

-- First, let's check if the client role exists
DO $$
DECLARE
    client_role_id uuid;
BEGIN
    -- Get the client role ID
    SELECT id INTO client_role_id FROM public.roles WHERE name = 'client';
    
    IF client_role_id IS NULL THEN
        RAISE EXCEPTION 'Client role does not exist. Please run the roles migration first.';
    END IF;
    
    RAISE NOTICE 'Found client role with ID: %', client_role_id;
END $$;

-- Create a function to automatically assign client role to new users
CREATE OR REPLACE FUNCTION public.auto_assign_client_role()
RETURNS TRIGGER AS $$
DECLARE
    client_role_id uuid;
BEGIN
    -- Get the client role ID
    SELECT id INTO client_role_id FROM public.roles WHERE name = 'client';
    
    -- If client role exists and user doesn't have a role assigned, assign client role
    IF client_role_id IS NOT NULL AND NEW.role_id IS NULL THEN
        NEW.role_id := client_role_id;
        RAISE NOTICE 'Automatically assigned client role to new user: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_client_role ON public.users;
CREATE TRIGGER trigger_auto_assign_client_role
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_client_role();

-- Test the trigger by checking existing users without roles
SELECT 
    'BEFORE TRIGGER' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    r.description as role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.role_id IS NULL
ORDER BY u.created_at DESC;

-- Update existing users without roles to have client role
UPDATE public.users 
SET 
    role_id = (SELECT id FROM public.roles WHERE name = 'client'),
    updated_at = NOW()
WHERE role_id IS NULL;

-- Verify the update
SELECT 
    'AFTER UPDATE' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    r.description as role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE r.name = 'client'
ORDER BY u.created_at DESC;

-- Show trigger information
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_assign_client_role';
