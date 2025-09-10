-- Migration: Add roles and permissions system
-- Date: $(date)
-- Description: Create roles and permissions tables with predefined roles

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  resource text NOT NULL, -- e.g., 'users', 'services', 'appointments'
  action text NOT NULL,    -- e.g., 'create', 'read', 'update', 'delete'
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(role_id, permission_id)
);

-- Add role_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_active_deleted ON public.roles (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_permissions_active_deleted ON public.permissions (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions (resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users (role_id);

-- Enable RLS on new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table
CREATE POLICY "Anyone can view active roles" 
  ON public.roles FOR select 
  USING (is_active = true AND is_deleted = false);

CREATE POLICY "Authenticated users can manage roles" 
  ON public.roles FOR all 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for permissions table
CREATE POLICY "Anyone can view active permissions" 
  ON public.permissions FOR select 
  USING (is_active = true AND is_deleted = false);

CREATE POLICY "Authenticated users can manage permissions" 
  ON public.permissions FOR all 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for role_permissions table
CREATE POLICY "Anyone can view role permissions" 
  ON public.role_permissions FOR select 
  USING (true);

CREATE POLICY "Authenticated users can manage role permissions" 
  ON public.role_permissions FOR all 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add updated_at triggers
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert predefined roles
INSERT INTO public.roles (name, description, is_active, is_deleted) VALUES
  ('super_admin', 'Super Administrator with full system access', true, false),
  ('practitioner', 'Practitioner with limited administrative access', true, false),
  ('client', 'Client with basic user access', true, false);

-- Insert predefined permissions
INSERT INTO public.permissions (name, description, resource, action, is_active, is_deleted) VALUES
  -- User management permissions
  ('users.create', 'Create new users', 'users', 'create', true, false),
  ('users.read', 'View users', 'users', 'read', true, false),
  ('users.update', 'Update user information', 'users', 'update', true, false),
  ('users.delete', 'Delete users', 'users', 'delete', true, false),
  
  -- Service management permissions
  ('services.create', 'Create new services', 'services', 'create', true, false),
  ('services.read', 'View services', 'services', 'read', true, false),
  ('services.update', 'Update service information', 'services', 'update', true, false),
  ('services.delete', 'Delete services', 'services', 'delete', true, false),
  
  -- Appointment management permissions
  ('appointments.create', 'Create new appointments', 'appointments', 'create', true, false),
  ('appointments.read', 'View appointments', 'appointments', 'read', true, false),
  ('appointments.update', 'Update appointment information', 'appointments', 'update', true, false),
  ('appointments.delete', 'Delete appointments', 'appointments', 'delete', true, false),
  
  -- Role management permissions
  ('roles.create', 'Create new roles', 'roles', 'create', true, false),
  ('roles.read', 'View roles', 'roles', 'read', true, false),
  ('roles.update', 'Update role information', 'roles', 'update', true, false),
  ('roles.delete', 'Delete roles', 'roles', 'delete', true, false),
  
  -- Permission management permissions
  ('permissions.create', 'Create new permissions', 'permissions', 'create', true, false),
  ('permissions.read', 'View permissions', 'permissions', 'read', true, false),
  ('permissions.update', 'Update permission information', 'permissions', 'update', true, false),
  ('permissions.delete', 'Delete permissions', 'permissions', 'delete', true, false);

-- Assign permissions to roles
DO $$
DECLARE
  super_admin_id uuid;
  practitioner_id uuid;
  client_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_id FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO practitioner_id FROM public.roles WHERE name = 'practitioner';
  SELECT id INTO client_id FROM public.roles WHERE name = 'client';
  
  -- Super Admin gets all permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT super_admin_id, id FROM public.permissions WHERE is_active = true AND is_deleted = false;
  
  -- Practitioner gets limited permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT practitioner_id, id FROM public.permissions 
  WHERE is_active = true AND is_deleted = false 
  AND name IN (
    'users.read', 'users.update',
    'services.create', 'services.read', 'services.update', 'services.delete',
    'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete'
  );
  
  -- Client gets basic permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT client_id, id FROM public.permissions 
  WHERE is_active = true AND is_deleted = false 
  AND name IN (
    'services.read',
    'appointments.create', 'appointments.read', 'appointments.update'
  );
END $$;

-- Create a view for users with their roles
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  u.*,
  r.name as role_name,
  r.description as role_description
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.is_active = true AND u.is_deleted = false
ORDER BY u.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.users_with_roles TO authenticated, anon;

-- Add comments to document the new tables
COMMENT ON TABLE public.roles IS 'User roles for access control (super_admin, practitioner, client)';
COMMENT ON TABLE public.permissions IS 'System permissions for different resources and actions';
COMMENT ON TABLE public.role_permissions IS 'Junction table linking roles to their permissions';
COMMENT ON COLUMN public.users.role_id IS 'Foreign key reference to the user''s assigned role';
