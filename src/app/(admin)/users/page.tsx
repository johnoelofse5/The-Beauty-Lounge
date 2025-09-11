'use client'

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_practitioner: boolean
  is_active: boolean
  is_deleted: boolean
  role_id: string | null
  role_name: string | null
  role_description: string | null
  created_at: string
  updated_at: string
}

interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
  is_deleted: boolean
}

interface UserFormData {
  email: string
  first_name: string
  last_name: string
  phone: string
  is_practitioner: boolean
  role_id: string | null
}

type ViewMode = 'all' | 'practitioners' | 'clients'

export default function UserManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewMode] = useState<ViewMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_practitioner: false,
    role_id: null
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isModalClosing, setIsModalClosing] = useState(false)

  // Refs for form inputs
  const emailRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const practitionerRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLSelectElement>(null)

  // Auto-dismiss messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Load users and roles
  useEffect(() => {
    if (user) {
      loadUsers()
      loadRoles()
    }
  }, [user])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles (
            id,
            name,
            description
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to include role information
      const transformedUsers = usersData?.map(user => ({
        ...user,
        role_name: user.role?.name || null,
        role_description: user.role?.description || null
      })) || []

      setUsers(transformedUsers)
    } catch (err) {
      setError('Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      if (error) throw error

      setRoles(rolesData || [])
    } catch (err) {
      console.error('Error loading roles:', err)
    }
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    // Use formData for edit mode, refs for add mode
    const email = isEditing ? formData.email : (emailRef.current?.value || '')
    const firstName = isEditing ? formData.first_name : (firstNameRef.current?.value || '')
    const lastName = isEditing ? formData.last_name : (lastNameRef.current?.value || '')
    const phone = isEditing ? formData.phone : (phoneRef.current?.value || '')

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!firstName.trim()) {
      errors.first_name = 'First name is required'
    }

    if (!lastName.trim()) {
      errors.last_name = 'Last name is required'
    }

    if (!phone.trim()) {
      errors.phone = 'Phone number is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddUser = async () => {
    if (!validateForm()) return

    try {
      const email = emailRef.current?.value || ''
      const firstName = firstNameRef.current?.value || ''
      const lastName = lastNameRef.current?.value || ''
      const phone = phoneRef.current?.value || ''
      const isPractitioner = practitionerRef.current?.checked || false
      const roleId = roleRef.current?.value || null

      // Create user record directly in the users table
      // The user will need to set up their password via password reset
      const { error } = await supabase
        .from('users')
        .insert([{
          id: crypto.randomUUID(),
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          is_practitioner: isPractitioner,
          role_id: roleId,
          is_active: true,
          is_deleted: false
        }])
        .select()
        .single()

      if (error) throw error

      setSuccess('User created successfully! The user will need to set up their password via password reset.')
      setShowAddUserModal(false)
      resetForm()
      loadUsers()
    } catch (err) {
      setError('Failed to create user. Please try again.')
      console.error('Error creating user:', err)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser || !validateForm()) return

    try {
      // Update user record
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          is_practitioner: formData.is_practitioner,
          role_id: formData.role_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id)

      if (error) throw error

      setSuccess('User updated successfully!')
      setShowUserModal(false)
      setIsEditing(false)
      resetForm()
      loadUsers()
    } catch (err) {
      setError('Failed to update user. Please try again.')
      console.error('Error updating user:', err)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_deleted: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setSuccess('User deleted successfully!')
      loadUsers()
    } catch (err) {
      setError('Failed to delete user. Please try again.')
      console.error('Error deleting user:', err)
    }
  }

  const resetForm = useCallback(() => {
    if (emailRef.current) emailRef.current.value = ''
    if (firstNameRef.current) firstNameRef.current.value = ''
    if (lastNameRef.current) lastNameRef.current.value = ''
    if (phoneRef.current) phoneRef.current.value = ''
    if (practitionerRef.current) practitionerRef.current.checked = false
    if (roleRef.current) roleRef.current.value = ''
    setFormErrors({})
  }, [])

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      is_practitioner: user.is_practitioner,
      role_id: user.role_id
    })
    if (emailRef.current) emailRef.current.value = user.email
    if (firstNameRef.current) firstNameRef.current.value = user.first_name
    if (lastNameRef.current) lastNameRef.current.value = user.last_name
    if (phoneRef.current) phoneRef.current.value = user.phone
    if (practitionerRef.current) practitionerRef.current.checked = user.is_practitioner
    if (roleRef.current) roleRef.current.value = user.role_id || ''
    setIsEditing(true)
    setShowUserModal(true)
  }

  const openAddModal = () => {
    resetForm()
    setIsEditing(false)
    setShowAddUserModal(true)
  }

  const closeModals = () => {
    setIsModalClosing(true)
    setTimeout(() => {
      setShowUserModal(false)
      setShowAddUserModal(false)
      setSelectedUser(null)
      setIsEditing(false)
      resetForm()
      setIsModalClosing(false)
    }, 300)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)

    switch (viewMode) {
      case 'practitioners':
        return matchesSearch && user.is_practitioner
      case 'clients':
        return matchesSearch && !user.is_practitioner
      default:
        return matchesSearch
    }
  })

  const InputWithError = memo(({ 
    label, 
    error, 
    required = false, 
    children 
  }: { 
    label: string
    error?: string
    required?: boolean
    children: React.ReactNode 
  }) => (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {children}
        {error && (
          <div className="absolute top-full left-0 mt-1 z-10">
            <div className="bg-red-500 text-white text-xs rounded px-2 py-1 shadow-lg relative">
              {error}
              <div className="absolute -top-1 left-3 w-2 h-2 bg-red-500 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  ))

  InputWithError.displayName = 'InputWithError'

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You must be logged in to manage users.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign In
          </Link>
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
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-[#F2C7EB] text-gray-900 px-4 py-2 rounded-md hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium"
          >
            Add User
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_practitioner 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_practitioner ? 'Practitioner' : 'Client'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role_name === 'super_admin' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role_name === 'practitioner'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role_name === 'client'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role_name || 'No Role'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                            title="Edit user"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                            title="Delete user"
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
        <div className="lg:hidden space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              {/* Clickable area for viewing details */}
              <div
                onClick={() => openEditModal(user)}
                className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.is_practitioner 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.is_practitioner ? 'Practitioner' : 'Client'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100"
                    title="Edit user"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-gray-100"
                    title="Delete user"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found matching your criteria.</p>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop - invisible but clickable */}
            <div 
              className="fixed inset-0 pointer-events-auto"
              onClick={closeModals}
            />
            
            {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
            <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-lg bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
              isModalClosing 
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}>
              {/* Handle bar (Mobile only) */}
              <div className="flex justify-center pt-3 pb-2 lg:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New User
                </h3>
                <button
                  type="button"
                  onClick={closeModals}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }} className="space-y-4" id="add-user-form">
                  <InputWithError label="Email" error={formErrors.email} required>
                    <input
                      ref={emailRef}
                      type="email"
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                        formErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </InputWithError>

                  <div className="grid grid-cols-2 gap-4">
                    <InputWithError label="First Name" error={formErrors.first_name} required>
                      <input
                        ref={firstNameRef}
                        type="text"
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                          formErrors.first_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                    </InputWithError>

                    <InputWithError label="Last Name" error={formErrors.last_name} required>
                      <input
                        ref={lastNameRef}
                        type="text"
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                          formErrors.last_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                    </InputWithError>
                  </div>

                  <InputWithError label="Phone" error={formErrors.phone} required>
                    <input
                      ref={phoneRef}
                      type="tel"
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                        formErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </InputWithError>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      ref={roleRef}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        ref={practitionerRef}
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Is Practitioner</span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="add-user-form"
                    className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop - invisible but clickable */}
            <div 
              className="fixed inset-0 pointer-events-auto"
              onClick={closeModals}
            />
            
            {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
            <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-lg bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
              isModalClosing 
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}>
              {/* Handle bar (Mobile only) */}
              <div className="flex justify-center pt-3 pb-2 lg:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit User
                </h3>
                <button
                  type="button"
                  onClick={closeModals}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <form onSubmit={(e) => { e.preventDefault(); handleEditUser(); }} className="space-y-4" id="edit-user-form">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputWithError label="First Name" error={formErrors.first_name} required>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => {
                          setFormData({ ...formData, first_name: e.target.value })
                          if (formErrors.first_name) {
                            setFormErrors({ ...formErrors, first_name: '' })
                          }
                        }}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                          formErrors.first_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                    </InputWithError>

                    <InputWithError label="Last Name" error={formErrors.last_name} required>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => {
                          setFormData({ ...formData, last_name: e.target.value })
                          if (formErrors.last_name) {
                            setFormErrors({ ...formErrors, last_name: '' })
                          }
                        }}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                          formErrors.last_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                    </InputWithError>
                  </div>

                  <InputWithError label="Phone" error={formErrors.phone} required>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value })
                        if (formErrors.phone) {
                          setFormErrors({ ...formErrors, phone: '' })
                        }
                      }}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                        formErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </InputWithError>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={formData.role_id || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, role_id: e.target.value || null })
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_practitioner}
                        onChange={(e) => {
                          setFormData({ ...formData, is_practitioner: e.target.checked })
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Is Practitioner</span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-user-form"
                    className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                  >
                    Update User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
