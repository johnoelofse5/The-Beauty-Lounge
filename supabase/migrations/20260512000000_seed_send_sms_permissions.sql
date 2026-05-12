-- Create the send_bulk permission for the sms resource
INSERT INTO public.permissions (name, description, resource, action, is_active, is_deleted, created_at, updated_at)
VALUES (
  'sms.send_bulk',
  'Send bulk SMS messages to users',
  'sms',
  'send_bulk',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Assign the permission to the super_admin role
INSERT INTO public.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
  AND p.name = 'sms.send_bulk'
  AND r.is_active = true
  AND r.is_deleted = false
ON CONFLICT (role_id, permission_id) DO NOTHING;
