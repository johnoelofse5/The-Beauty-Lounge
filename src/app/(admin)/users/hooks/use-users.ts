'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminUser, AdminRole, UserFormData, UserViewMode } from '@/types';

export function useUsers() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode] = useState<UserViewMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_practitioner: false,
    role_id: null,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isModalClosing, setIsModalClosing] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const practitionerRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (user) {
      loadUsers();
      loadRoles();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select(
          `
          id, email, phone, first_name, last_name, created_at,
          is_active, is_deleted, is_practitioner, role_id, updated_at,
          role:roles (id, name, description)
        `
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedUsers =
        usersData?.map((user: any) => ({
          ...user,
          role_name: user.role?.name || null,
          role_description: user.role?.description || null,
        })) || [];

      setUsers(transformedUsers);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) throw error;
      setRoles(rolesData || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const email = isEditing ? formData.email : emailRef.current?.value || '';
    const firstName = isEditing ? formData.first_name : firstNameRef.current?.value || '';
    const lastName = isEditing ? formData.last_name : lastNameRef.current?.value || '';
    const phone = isEditing ? formData.phone : phoneRef.current?.value || '';

    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Please enter a valid email';
    if (!firstName.trim()) errors.first_name = 'First name is required';
    if (!lastName.trim()) errors.last_name = 'Last name is required';
    if (!phone.trim()) errors.phone = 'Phone number is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = useCallback(() => {
    if (emailRef.current) emailRef.current.value = '';
    if (firstNameRef.current) firstNameRef.current.value = '';
    if (lastNameRef.current) lastNameRef.current.value = '';
    if (phoneRef.current) phoneRef.current.value = '';
    if (practitionerRef.current) practitionerRef.current.checked = false;
    if (roleRef.current) roleRef.current.value = '';
    setFormErrors({});
  }, []);

  const handleAddUser = async () => {
    if (!validateForm()) return;
    try {
      const { email, first_name, last_name, phone, is_practitioner, role_id } = formData;

      const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
        body: { email, phone, first_name, last_name },
      });

      if (authError || !authData?.user?.id) {
        throw new Error(
          'Creating users requires an admin edge function. Ask the user to sign up instead.'
        );
      }

      const { error } = await supabase
        .from('users')
        .update({ first_name, last_name, phone, is_practitioner, role_id })
        .eq('id', authData.user.id);

      if (error) throw error;

      setSuccess('User created successfully!');
      setShowAddUserModal(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user. Please try again.');
      console.error('Error creating user:', err);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !validateForm()) return;
    try {
      if (formData.phone !== selectedUser.phone) {
        const { error: phoneError } = await supabase.functions.invoke('admin-update-user', {
          body: { user_id: selectedUser.id, phone: formData.phone },
        });
        if (phoneError) throw new Error('Failed to update phone number');
      }

      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_practitioner: formData.is_practitioner,
          role_id: formData.role_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (userError) throw userError;

      setSuccess('User updated successfully!');
      setShowUserModal(false);
      setIsEditing(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user. Please try again.');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setSuccess('User deleted successfully!');
      loadUsers();
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      console.error('Error deleting user:', err);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      is_practitioner: user.is_practitioner || false,
      role_id: user.role_id || null,
    });
    setIsEditing(true);
    setShowUserModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      is_practitioner: false,
      role_id: null,
    });
    setIsEditing(false);
    setShowAddUserModal(true);
  };

  const closeModals = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowUserModal(false);
      setShowAddUserModal(false);
      setSelectedUser(null);
      setIsEditing(false);
      resetForm();
      setIsModalClosing(false);
    }, 300);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.first_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      u.last_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      u.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      u.phone?.includes(searchTerm);

    switch (viewMode) {
      case 'practitioners':
        return matchesSearch && u.is_practitioner;
      case 'clients':
        return matchesSearch && !u.is_practitioner;
      default:
        return matchesSearch;
    }
  });

  return {
    user,
    authLoading,
    loading,
    error,
    success,
    users,
    roles,
    filteredUsers,
    searchTerm,
    setSearchTerm,
    selectedUser,
    showUserModal,
    showAddUserModal,
    isModalClosing,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    practitionerRef,
    openAddModal,
    openEditModal,
    closeModals,
    handleAddUser,
    handleEditUser,
    handleDeleteUser,
  };
}
