-- Migration: Create permission sets for portfolio and schedule management
-- Date: $(date)
-- Description: Add specific permissions for portfolio and schedule management

-- Insert new permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('portfolio.view', 'View portfolio items', 'portfolio', 'read'),
('portfolio.manage', 'Manage portfolio items (create, update, delete)', 'portfolio', 'write'),
('schedule.manage', 'Manage working schedule', 'schedule', 'write'),
('schedule.view', 'View working schedule', 'schedule', 'read')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions directly to roles
-- Practitioners get portfolio and schedule management permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'practitioner' 
AND p.name IN ('portfolio.view', 'portfolio.manage', 'schedule.view', 'schedule.manage')
ON CONFLICT DO NOTHING;

-- Super admins get all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'super_admin' 
AND p.name IN ('portfolio.view', 'portfolio.manage', 'schedule.view', 'schedule.manage')
ON CONFLICT DO NOTHING;

-- Clients get portfolio viewing permission only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'client' 
AND p.name = 'portfolio.view'
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE public.permissions IS 'Individual permissions for specific actions on resources';
COMMENT ON TABLE public.role_permissions IS 'Links permissions directly to roles';

-- Example queries:
-- Check if user has portfolio management permission:
-- SELECT EXISTS (
--   SELECT 1 FROM users u
--   JOIN roles r ON u.role_id = r.id
--   JOIN role_permissions rp ON r.id = rp.role_id
--   JOIN permissions p ON rp.permission_id = p.id
--   WHERE u.id = 'user-id' AND p.name = 'portfolio.manage'
-- );
