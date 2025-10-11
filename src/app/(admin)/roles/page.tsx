'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Role, Permission, RoleWithPermissions, InputWithErrorProps } from '@/types'

const InputWithError = ({ label, error, required, children }: InputWithErrorProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        {error}
      </div>
    )}
  </div>
)

export default function RolesPage() {
  const { user } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RoleWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isRoleModalClosing, setIsRoleModalClosing] = useState(false)
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: ''
  })
  const [roleFormErrors, setRoleFormErrors] = useState<{ [key: string]: string }>({})

  
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [isPermissionModalClosing, setIsPermissionModalClosing] = useState(false)
  const [permissionForm, setPermissionForm] = useState({
    name: '',
    description: '',
    resource: '',
    action: ''
  })
  const [permissionFormErrors, setPermissionFormErrors] = useState<{ [key: string]: string }>({})

  
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name')

      if (rolesError) throw rolesError

      
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('resource', { ascending: true })
        .order('action', { ascending: true })

      if (permissionsError) throw permissionsError

      
      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          roles(*),
          permissions(*)
        `)

      if (rolePermissionsError) throw rolePermissionsError
      
      
      const rolePermissionsMap = new Map<string, RoleWithPermissions>()
      
      rolePermissionsData?.forEach((rp: any) => {
        const roleId = rp.role_id
        const role = rp.roles
        const permission = rp.permissions
        
        if (!rolePermissionsMap.has(roleId)) {
          rolePermissionsMap.set(roleId, {
            ...role,
            permissions: []
          })
        }
        if (permission) {
          rolePermissionsMap.get(roleId)?.permissions.push(permission)
        }
      })

      const transformedRolePermissions = Array.from(rolePermissionsMap.values())
      

      setRoles(rolesData || [])
      setPermissions(permissionsData || [])
      setRolePermissions(transformedRolePermissions)
    } catch (err) {
      setError('Failed to load roles and permissions')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message)
      setError('')
    } else {
      setError(message)
      setSuccess('')
    }
    setTimeout(() => {
      setSuccess('')
      setError('')
    }, 3000)
  }

  const validateRoleForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!roleForm.name.trim()) {
      errors.name = 'Role name is required'
    } else if (roleForm.name.length < 2) {
      errors.name = 'Role name must be at least 2 characters'
    }

    if (!roleForm.description.trim()) {
      errors.description = 'Role description is required'
    }

    setRoleFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validatePermissionForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!permissionForm.name.trim()) {
      errors.name = 'Permission name is required'
    }

    if (!permissionForm.description.trim()) {
      errors.description = 'Permission description is required'
    }

    if (!permissionForm.resource.trim()) {
      errors.resource = 'Resource is required'
    }

    if (!permissionForm.action.trim()) {
      errors.action = 'Action is required'
    }

    setPermissionFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveRole = async () => {
    if (!validateRoleForm()) return

    try {
      if (editingRole) {
        
        const { error } = await supabase
          .from('roles')
          .update({
            name: roleForm.name,
            description: roleForm.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id)

        if (error) throw error
        showMessage('Role updated successfully!', 'success')
      } else {
        
        const { error } = await supabase
          .from('roles')
          .insert([{
            name: roleForm.name,
            description: roleForm.description,
            is_active: true,
            is_deleted: false
          }])

        if (error) throw error
        showMessage('Role created successfully!', 'success')
      }

      closeRoleModal()
      await loadData()
    } catch (err) {
      showMessage('Failed to save role. Please try again.', 'error')
      console.error('Error saving role:', err)
    }
  }

  const handleSavePermission = async () => {
    if (!validatePermissionForm()) return

    try {
      if (editingPermission) {
        
        const { error } = await supabase
          .from('permissions')
          .update({
            name: permissionForm.name,
            description: permissionForm.description,
            resource: permissionForm.resource,
            action: permissionForm.action,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPermission.id)

        if (error) throw error
        showMessage('Permission updated successfully!', 'success')
      } else {
        
        const { error } = await supabase
          .from('permissions')
          .insert([{
            name: permissionForm.name,
            description: permissionForm.description,
            resource: permissionForm.resource,
            action: permissionForm.action,
            is_active: true,
            is_deleted: false
          }])

        if (error) throw error
        showMessage('Permission created successfully!', 'success')
      }

      closePermissionModal()
      await loadData()
    } catch (err) {
      showMessage('Failed to save permission. Please try again.', 'error')
      console.error('Error saving permission:', err)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('roles')
        .update({
          is_deleted: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)

      if (error) throw error

      showMessage('Role deleted successfully!', 'success')
      await loadData()
    } catch (err) {
      showMessage('Failed to delete role. Please try again.', 'error')
      console.error('Error deleting role:', err)
    }
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('permissions')
        .update({
          is_deleted: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', permissionId)

      if (error) throw error

      showMessage('Permission deleted successfully!', 'success')
      await loadData()
    } catch (err) {
      showMessage('Failed to delete permission. Please try again.', 'error')
      console.error('Error deleting permission:', err)
    }
  }

  const resetRoleForm = () => {
    setRoleForm({ name: '', description: '' })
    setRoleFormErrors({})
    setEditingRole(null)
  }

  const resetPermissionForm = () => {
    setPermissionForm({ name: '', description: '', resource: '', action: '' })
    setPermissionFormErrors({})
    setEditingPermission(null)
  }

  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      setRoleForm({
        name: role.name,
        description: role.description
      })
    } else {
      resetRoleForm()
    }
    setShowRoleModal(true)
  }

  const openPermissionModal = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission)
      setPermissionForm({
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action
      })
    } else {
      resetPermissionForm()
    }
    setShowPermissionModal(true)
  }

  const openRolePermissionsModal = (role: Role) => {
    setSelectedRole(role)
    
    
    const roleWithPermissions = rolePermissions.find(rp => rp.id === role.id)
    
    if (roleWithPermissions) {
      setSelectedPermissions(roleWithPermissions.permissions.map(p => p.id))
    } else {
      setSelectedPermissions([])
    }
    
    setShowRolePermissionsModal(true)
  }

  const closeRoleModal = () => {
    setIsRoleModalClosing(true)
    setTimeout(() => {
      setShowRoleModal(false)
      setIsRoleModalClosing(false)
      resetRoleForm()
    }, 300)
  }

  const closePermissionModal = () => {
    setIsPermissionModalClosing(true)
    setTimeout(() => {
      setShowPermissionModal(false)
      setIsPermissionModalClosing(false)
      resetPermissionForm()
    }, 300)
  }

  const closeRolePermissionsModal = () => {
    setShowRolePermissionsModal(false)
    setSelectedRole(null)
    setSelectedPermissions([])
  }

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return

    try {
      
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id)

      if (deleteError) throw deleteError

      
      if (selectedPermissions.length > 0) {
        const rolePermissionInserts = selectedPermissions.map(permissionId => ({
          role_id: selectedRole.id,
          permission_id: permissionId
        }))

        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(rolePermissionInserts)

        if (insertError) throw insertError
      }

      showMessage('Role permissions updated successfully!', 'success')
      closeRolePermissionsModal()
      await loadData()
    } catch (err) {
      showMessage('Failed to update role permissions. Please try again.', 'error')
      console.error('Error updating role permissions:', err)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You must be logged in to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F2C7EB] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roles and permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => openRoleModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F2C7EB] hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Role
          </button>
          <button
            onClick={() => openPermissionModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F6D5F0] hover:bg-[#F2C7EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Permission
          </button>
        </div>

        {/* Roles Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Roles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openRolePermissionsModal(role)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-gray-100"
                      title="Manage permissions"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openRoleModal(role)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                      title="Edit role"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                      title="Delete role"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  Created: {new Date(role.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Permissions</h2>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((permission) => (
                      <tr key={permission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {permission.resource}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {permission.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{permission.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openPermissionModal(permission)}
                              className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                              title="Edit permission"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePermission(permission.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                              title="Delete permission"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            <div className="space-y-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{permission.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openPermissionModal(permission)}
                        className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                        title="Edit permission"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePermission(permission.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                        title="Delete permission"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {permission.resource}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {permission.action}
                      </span>
                    </div>
                    
                    {permission.description && (
                      <p className="text-sm text-gray-600">{permission.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closeRoleModal}
          />
          
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
            isRoleModalClosing 
              ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
              : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              <button
                type="button"
                onClick={closeRoleModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveRole(); }} className="space-y-4" id="role-form">
                <InputWithError 
                  label="Role Name" 
                  required 
                  error={roleFormErrors.name}
                >
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => {
                      setRoleForm({ ...roleForm, name: e.target.value })
                      if (roleFormErrors.name) {
                        setRoleFormErrors({ ...roleFormErrors, name: '' })
                      }
                    }}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                      roleFormErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </InputWithError>

                <InputWithError 
                  label="Description" 
                  required 
                  error={roleFormErrors.description}
                >
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => {
                      setRoleForm({ ...roleForm, description: e.target.value })
                      if (roleFormErrors.description) {
                        setRoleFormErrors({ ...roleFormErrors, description: '' })
                      }
                    }}
                    rows={3}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                      roleFormErrors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </InputWithError>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="role-form"
                  className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closePermissionModal}
          />
          
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
            isPermissionModalClosing 
              ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
              : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPermission ? 'Edit Permission' : 'Add New Permission'}
              </h3>
              <button
                type="button"
                onClick={closePermissionModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSavePermission(); }} className="space-y-4" id="permission-form">
                <InputWithError 
                  label="Permission Name" 
                  required 
                  error={permissionFormErrors.name}
                >
                  <input
                    type="text"
                    value={permissionForm.name}
                    onChange={(e) => {
                      setPermissionForm({ ...permissionForm, name: e.target.value })
                      if (permissionFormErrors.name) {
                        setPermissionFormErrors({ ...permissionFormErrors, name: '' })
                      }
                    }}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                      permissionFormErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </InputWithError>

                <div className="grid grid-cols-2 gap-4">
                  <InputWithError 
                    label="Resource" 
                    required 
                    error={permissionFormErrors.resource}
                  >
                    <input
                      type="text"
                      value={permissionForm.resource}
                      onChange={(e) => {
                        setPermissionForm({ ...permissionForm, resource: e.target.value })
                        if (permissionFormErrors.resource) {
                          setPermissionFormErrors({ ...permissionFormErrors, resource: '' })
                        }
                      }}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                        permissionFormErrors.resource ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </InputWithError>

                  <InputWithError 
                    label="Action" 
                    required 
                    error={permissionFormErrors.action}
                  >
                    <input
                      type="text"
                      value={permissionForm.action}
                      onChange={(e) => {
                        setPermissionForm({ ...permissionForm, action: e.target.value })
                        if (permissionFormErrors.action) {
                          setPermissionFormErrors({ ...permissionFormErrors, action: '' })
                        }
                      }}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                        permissionFormErrors.action ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </InputWithError>
                </div>

                <InputWithError 
                  label="Description" 
                  required 
                  error={permissionFormErrors.description}
                >
                  <textarea
                    value={permissionForm.description}
                    onChange={(e) => {
                      setPermissionForm({ ...permissionForm, description: e.target.value })
                      if (permissionFormErrors.description) {
                        setPermissionFormErrors({ ...permissionFormErrors, description: '' })
                      }
                    }}
                    rows={3}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                      permissionFormErrors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </InputWithError>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closePermissionModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="permission-form"
                  className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                >
                  {editingPermission ? 'Update Permission' : 'Create Permission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Modal */}
      {showRolePermissionsModal && selectedRole && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closeRolePermissionsModal}
          />
          
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
            'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Permissions for {selectedRole.name}
              </h3>
              <button
                type="button"
                onClick={closeRolePermissionsModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {permissions.map((permission) => (
                  <label key={permission.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="h-5 w-5 text-[#F2C7EB] focus:ring-[#F2C7EB] border-gray-300 rounded flex-shrink-0"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{permission.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {permission.resource}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {permission.action}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeRolePermissionsModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRolePermissions}
                  className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
