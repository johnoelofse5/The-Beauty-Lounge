-- Migration: Seed permissions for inventory and finance management
-- Date: $(date)
-- Description: Add permissions for inventory and financial management features

-- Insert inventory management permissions
INSERT INTO public.permissions (name, description, resource, action, is_active, is_deleted) VALUES
  -- Inventory management permissions
  ('inventory.create', 'Create new inventory items', 'inventory', 'create', true, false),
  ('inventory.read', 'View inventory items', 'inventory', 'read', true, false),
  ('inventory.update', 'Update inventory items', 'inventory', 'update', true, false),
  ('inventory.delete', 'Delete inventory items', 'inventory', 'delete', true, false),
  
  -- Inventory categories permissions
  ('inventory_categories.create', 'Create new inventory categories', 'inventory_categories', 'create', true, false),
  ('inventory_categories.read', 'View inventory categories', 'inventory_categories', 'read', true, false),
  ('inventory_categories.update', 'Update inventory categories', 'inventory_categories', 'update', true, false),
  ('inventory_categories.delete', 'Delete inventory categories', 'inventory_categories', 'delete', true, false),
  
  -- Stock movements permissions
  ('stock_movements.create', 'Create stock movements', 'stock_movements', 'create', true, false),
  ('stock_movements.read', 'View stock movements', 'stock_movements', 'read', true, false),
  ('stock_movements.update', 'Update stock movements', 'stock_movements', 'update', true, false),
  ('stock_movements.delete', 'Delete stock movements', 'stock_movements', 'delete', true, false),
  
  -- Purchase orders permissions
  ('purchase_orders.create', 'Create purchase orders', 'purchase_orders', 'create', true, false),
  ('purchase_orders.read', 'View purchase orders', 'purchase_orders', 'read', true, false),
  ('purchase_orders.update', 'Update purchase orders', 'purchase_orders', 'update', true, false),
  ('purchase_orders.delete', 'Delete purchase orders', 'purchase_orders', 'delete', true, false),
  
  -- Financial transactions permissions
  ('financial_transactions.create', 'Create financial transactions', 'financial_transactions', 'create', true, false),
  ('financial_transactions.read', 'View financial transactions', 'financial_transactions', 'read', true, false),
  ('financial_transactions.update', 'Update financial transactions', 'financial_transactions', 'update', true, false),
  ('financial_transactions.delete', 'Delete financial transactions', 'financial_transactions', 'delete', true, false),
  
  -- Service inventory relationships permissions
  ('service_inventory.create', 'Create service inventory relationships', 'service_inventory', 'create', true, false),
  ('service_inventory.read', 'View service inventory relationships', 'service_inventory', 'read', true, false),
  ('service_inventory.update', 'Update service inventory relationships', 'service_inventory', 'update', true, false),
  ('service_inventory.delete', 'Delete service inventory relationships', 'service_inventory', 'delete', true, false),
  
  -- Financial reports permissions
  ('financial_reports.read', 'View financial reports and analytics', 'financial_reports', 'read', true, false),
  ('inventory_reports.read', 'View inventory reports and analytics', 'inventory_reports', 'read', true, false),
  
  -- Dashboard permissions
  ('inventory_dashboard.read', 'View inventory dashboard', 'inventory_dashboard', 'read', true, false),
  ('financial_dashboard.read', 'View financial dashboard', 'financial_dashboard', 'read', true, false);

-- Assign inventory and finance permissions to super_admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
AND p.name IN (
  'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
  'inventory_categories.create', 'inventory_categories.read', 'inventory_categories.update', 'inventory_categories.delete',
  'stock_movements.create', 'stock_movements.read', 'stock_movements.update', 'stock_movements.delete',
  'purchase_orders.create', 'purchase_orders.read', 'purchase_orders.update', 'purchase_orders.delete',
  'financial_transactions.create', 'financial_transactions.read', 'financial_transactions.update', 'financial_transactions.delete',
  'service_inventory.create', 'service_inventory.read', 'service_inventory.update', 'service_inventory.delete',
  'financial_reports.read', 'inventory_reports.read',
  'inventory_dashboard.read', 'financial_dashboard.read'
)
AND p.is_active = true 
AND p.is_deleted = false;

-- Assign limited inventory and finance permissions to practitioner role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'practitioner'
AND p.name IN (
  'inventory.read', 'inventory.update',
  'inventory_categories.read',
  'stock_movements.create', 'stock_movements.read', 'stock_movements.update',
  'financial_transactions.create', 'financial_transactions.read', 'financial_transactions.update',
  'service_inventory.create', 'service_inventory.read', 'service_inventory.update', 'service_inventory.delete',
  'financial_reports.read', 'inventory_reports.read',
  'inventory_dashboard.read', 'financial_dashboard.read'
)
AND p.is_active = true 
AND p.is_deleted = false;

-- Add comments to document the new permissions
COMMENT ON TABLE public.permissions IS 'System permissions for different resources and actions - now includes inventory and finance management';

-- Create a view for permissions by role for easier management
CREATE OR REPLACE VIEW public.role_permissions_view AS
SELECT 
  r.name as role_name,
  r.description as role_description,
  p.name as permission_name,
  p.description as permission_description,
  p.resource,
  p.action,
  rp.created_at as assigned_at
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE r.is_active = true 
AND r.is_deleted = false
AND p.is_active = true 
AND p.is_deleted = false
ORDER BY r.name, p.resource, p.action;

-- Grant access to the view
GRANT SELECT ON public.role_permissions_view TO authenticated, anon;

-- Add comment to the view
COMMENT ON VIEW public.role_permissions_view IS 'View showing all permissions assigned to each role for easier management and debugging';
