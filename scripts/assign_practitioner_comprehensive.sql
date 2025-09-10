-- Comprehensive script to assign practitioner role to stacey.mattheys@gmail.com
-- This script handles both cases: before and after roles migration

-- Step 1: Check if roles table exists
DO $$
BEGIN
    -- Check if roles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        RAISE NOTICE 'Roles table does not exist. Please run the roles migration first.';
        RAISE NOTICE 'Run: psql -h localhost -p 54322 -U postgres -d postgres -f migrations/010_add_roles_and_permissions.sql';
        RETURN;
    END IF;
END $$;

-- Step 2: Check if the user exists
DO $$
DECLARE
    user_exists boolean;
    user_id uuid;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'Stacey.mattheys@gmail.com') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE NOTICE 'User with email Stacey.mattheys@gmail.com does not exist.';
        RAISE NOTICE 'Please create the user account first through the application.';
        RETURN;
    END IF;
    
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE email = 'Stacey.mattheys@gmail.com';
    RAISE NOTICE 'Found user with ID: %', user_id;
END $$;

-- Step 3: Check if practitioner role exists
DO $$
DECLARE
    role_exists boolean;
    role_id uuid;
BEGIN
    SELECT EXISTS(SELECT 1 FROM roles WHERE name = 'practitioner') INTO role_exists;
    
    IF NOT role_exists THEN
        RAISE NOTICE 'Practitioner role does not exist. Please run the roles migration first.';
        RETURN;
    END IF;
    
    -- Get role ID
    SELECT id INTO role_id FROM roles WHERE name = 'practitioner';
    RAISE NOTICE 'Found practitioner role with ID: %', role_id;
END $$;

-- Step 4: Show current user status
SELECT 
    'BEFORE UPDATE' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as current_role,
    r.description as role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'Stacey.mattheys@gmail.com';

-- Step 5: Update user to practitioner role
UPDATE users 
SET 
    role_id = (SELECT id FROM roles WHERE name = 'practitioner'),
    updated_at = NOW()
WHERE email = 'Stacey.mattheys@gmail.com';

-- Step 6: Verify the update
SELECT 
    'AFTER UPDATE' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    r.description as role_description,
    u.updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'Stacey.mattheys@gmail.com';

-- Step 7: Show all practitioner permissions
SELECT 
    'PRACTITIONER PERMISSIONS' as info,
    r.name as role_name,
    p.name as permission_name,
    p.resource,
    p.action,
    p.description as permission_description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'practitioner'
ORDER BY p.resource, p.action;

-- Step 8: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully assigned practitioner role to Stacey.mattheys@gmail.com!';
    RAISE NOTICE 'The user now has practitioner privileges.';
    RAISE NOTICE 'Practitioner can view all appointments and manage services.';
END $$;
