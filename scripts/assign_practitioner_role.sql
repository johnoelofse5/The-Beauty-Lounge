-- Check if the user exists and get their current role
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    r.name as current_role,
    r.description as role_description
FROM user_profiles up
LEFT JOIN roles r ON up.role_id = r.id
WHERE up.email = 'stacey.mattheys@gmail.com';

-- Get the practitioner role ID
SELECT id, name, description 
FROM roles 
WHERE name = 'practitioner';

-- Update the user to have practitioner role and set is_practitioner flag
UPDATE public.users 
SET 
    role_id = (SELECT id FROM roles WHERE name = 'practitioner'),
    is_practitioner = true,
    updated_at = NOW()
WHERE id = (
    SELECT id FROM auth.users WHERE lower(email) = 'stacey.mattheys@gmail.com'
);

-- Verify the update was successful
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_practitioner,
    r.name as role_name,
    r.description as role_description,
    up.updated_at
FROM user_profiles up
LEFT JOIN roles r ON up.role_id = r.id
WHERE up.email = 'stacey.mattheys@gmail.com';

-- Show all permissions that the practitioner role has
SELECT 
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