-- Script to assign super_admin role to specific user
-- Run this script to give johnoelofse5@gmail.com super admin privileges

-- First, let's check if the user exists and get their current role
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as current_role,
    r.description as role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'johnoelofse5@gmail.com';

-- Get the super_admin role ID
SELECT id, name, description 
FROM roles 
WHERE name = 'super_admin';

-- Update the user to have super_admin role
UPDATE users 
SET 
    role_id = (SELECT id FROM roles WHERE name = 'super_admin'),
    updated_at = NOW()
WHERE email = 'johnoelofse5@gmail.com';

-- Verify the update was successful
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    r.description as role_description,
    u.updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'johnoelofse5@gmail.com';

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
