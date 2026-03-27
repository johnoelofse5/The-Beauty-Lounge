INSERT INTO public.permissions (name, description, resource, action, is_active, is_deleted, created_at, updated_at)
VALUES
  ('analytics.view', 'View analytics dashboard', 'analytics', 'view', true, false, NOW(), NOW()),
  ('analytics.edit', 'Edit analytics settings', 'analytics', 'edit', true, false, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
