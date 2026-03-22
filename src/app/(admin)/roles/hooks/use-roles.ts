'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Role, Permission, RoleWithPermissions } from '@/types';

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // #region Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isRoleModalClosing, setIsRoleModalClosing] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleFormErrors, setRoleFormErrors] = useState<{ [key: string]: string }>({});
  // #endregion

  // #region Permission modal
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [isPermissionModalClosing, setIsPermissionModalClosing] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    name: '',
    description: '',
    resource: '',
    action: '',
  });
  const [permissionFormErrors, setPermissionFormErrors] = useState<{ [key: string]: string }>({});
  // #endregion

  // #region Role permissions modal
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  // #endregion

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name');
      if (rolesError) throw rolesError;

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('resource', { ascending: true })
        .order('action', { ascending: true });
      if (permissionsError) throw permissionsError;

      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .select(`role_id, roles(*), permissions(*)`);
      if (rolePermissionsError) throw rolePermissionsError;

      const rolePermissionsMap = new Map<string, RoleWithPermissions>();
      rolePermissionsData?.forEach((rp: any) => {
        const roleId = rp.role_id;
        if (!rolePermissionsMap.has(roleId)) {
          rolePermissionsMap.set(roleId, { ...rp.roles, permissions: [] });
        }
        if (rp.permissions) {
          rolePermissionsMap.get(roleId)?.permissions.push(rp.permissions);
        }
      });

      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setRolePermissions(Array.from(rolePermissionsMap.values()));
    } catch (err) {
      setError('Failed to load roles and permissions');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  // Role form
  const validateRoleForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!roleForm.name.trim()) errors.name = 'Role name is required';
    else if (roleForm.name.length < 2) errors.name = 'Role name must be at least 2 characters';
    if (!roleForm.description.trim()) errors.description = 'Role description is required';
    setRoleFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetRoleForm = () => {
    setRoleForm({ name: '', description: '' });
    setRoleFormErrors({});
    setEditingRole(null);
  };

  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description });
    } else {
      resetRoleForm();
    }
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalClosing(true);
    setTimeout(() => {
      setShowRoleModal(false);
      setIsRoleModalClosing(false);
      resetRoleForm();
    }, 300);
  };

  const handleSaveRole = async () => {
    if (!validateRoleForm()) return;
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update({
            name: roleForm.name,
            description: roleForm.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id);
        if (error) throw error;
        showMessage('Role updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([
            {
              name: roleForm.name,
              description: roleForm.description,
              is_active: true,
              is_deleted: false,
            },
          ]);
        if (error) throw error;
        showMessage('Role created successfully!', 'success');
      }
      closeRoleModal();
      await loadData();
    } catch (err) {
      showMessage('Failed to save role. Please try again.', 'error');
      console.error('Error saving role:', err);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.'))
      return;
    try {
      const { error } = await supabase
        .from('roles')
        .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', roleId);
      if (error) throw error;
      showMessage('Role deleted successfully!', 'success');
      await loadData();
    } catch (err) {
      showMessage('Failed to delete role. Please try again.', 'error');
      console.error('Error deleting role:', err);
    }
  };

  // Permission form
  const validatePermissionForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!permissionForm.name.trim()) errors.name = 'Permission name is required';
    if (!permissionForm.description.trim())
      errors.description = 'Permission description is required';
    if (!permissionForm.resource.trim()) errors.resource = 'Resource is required';
    if (!permissionForm.action.trim()) errors.action = 'Action is required';
    setPermissionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetPermissionForm = () => {
    setPermissionForm({ name: '', description: '', resource: '', action: '' });
    setPermissionFormErrors({});
    setEditingPermission(null);
  };

  const openPermissionModal = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission);
      setPermissionForm({
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      });
    } else {
      resetPermissionForm();
    }
    setShowPermissionModal(true);
  };

  const closePermissionModal = () => {
    setIsPermissionModalClosing(true);
    setTimeout(() => {
      setShowPermissionModal(false);
      setIsPermissionModalClosing(false);
      resetPermissionForm();
    }, 300);
  };

  const handleSavePermission = async () => {
    if (!validatePermissionForm()) return;
    try {
      if (editingPermission) {
        const { error } = await supabase
          .from('permissions')
          .update({
            name: permissionForm.name,
            description: permissionForm.description,
            resource: permissionForm.resource,
            action: permissionForm.action,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPermission.id);
        if (error) throw error;
        showMessage('Permission updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('permissions')
          .insert([
            {
              name: permissionForm.name,
              description: permissionForm.description,
              resource: permissionForm.resource,
              action: permissionForm.action,
              is_active: true,
              is_deleted: false,
            },
          ]);
        if (error) throw error;
        showMessage('Permission created successfully!', 'success');
      }
      closePermissionModal();
      await loadData();
    } catch (err) {
      showMessage('Failed to save permission. Please try again.', 'error');
      console.error('Error saving permission:', err);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission? This action cannot be undone.'))
      return;
    try {
      const { error } = await supabase
        .from('permissions')
        .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', permissionId);
      if (error) throw error;
      showMessage('Permission deleted successfully!', 'success');
      await loadData();
    } catch (err) {
      showMessage('Failed to delete permission. Please try again.', 'error');
      console.error('Error deleting permission:', err);
    }
  };

  // Role permissions modal
  const openRolePermissionsModal = (role: Role) => {
    setSelectedRole(role);
    const roleWithPermissions = rolePermissions.find((rp) => rp.id === role.id);
    setSelectedPermissions(
      roleWithPermissions ? roleWithPermissions.permissions.map((p) => p.id) : []
    );
    setShowRolePermissionsModal(true);
  };

  const closeRolePermissionsModal = () => {
    setShowRolePermissionsModal(false);
    setSelectedRole(null);
    setSelectedPermissions([]);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);
      if (deleteError) throw deleteError;

      if (selectedPermissions.length > 0) {
        const inserts = selectedPermissions.map((permissionId) => ({
          role_id: selectedRole.id,
          permission_id: permissionId,
        }));
        const { error: insertError } = await supabase.from('role_permissions').insert(inserts);
        if (insertError) throw insertError;
      }

      showMessage('Role permissions updated successfully!', 'success');
      closeRolePermissionsModal();
      await loadData();
    } catch (err) {
      showMessage('Failed to update role permissions. Please try again.', 'error');
      console.error('Error updating role permissions:', err);
    }
  };

  return {
    user,
    roles,
    permissions,
    loading,
    error,
    success,
    showRoleModal,
    editingRole,
    isRoleModalClosing,
    roleForm,
    roleFormErrors,
    setRoleForm,
    setRoleFormErrors,
    openRoleModal,
    closeRoleModal,
    handleSaveRole,
    handleDeleteRole,
    showPermissionModal,
    editingPermission,
    isPermissionModalClosing,
    permissionForm,
    permissionFormErrors,
    setPermissionForm,
    setPermissionFormErrors,
    openPermissionModal,
    closePermissionModal,
    handleSavePermission,
    handleDeletePermission,
    showRolePermissionsModal,
    selectedRole,
    selectedPermissions,
    openRolePermissionsModal,
    closeRolePermissionsModal,
    handlePermissionToggle,
    handleSaveRolePermissions,
  };
}
