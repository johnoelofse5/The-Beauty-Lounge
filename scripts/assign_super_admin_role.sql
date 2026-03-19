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
WHERE up.email = 'johnoelofse5@gmail.com';

-- Get the super_admin role ID
SELECT id, name, description 
FROM roles 
WHERE name = 'super_admin';

-- Update the user to have super_admin role
UPDATE public.users 
SET 
    role_id = (SELECT id FROM roles WHERE name = 'super_admin'),
    updated_at = NOW()
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'johnoelofse5@gmail.com'
);

-- Verify the update was successful
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    r.name as role_name,
    r.description as role_description,
    up.updated_at
FROM user_profiles up
LEFT JOIN roles r ON up.role_id = r.id
WHERE up.email = 'johnoelofse5@gmail.com';

-- Show all permissions that the super_admin role has
SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.resource,
    p.action,
    p.description as permission_description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'super_admin'
ORDER BY p.resource, p.action;