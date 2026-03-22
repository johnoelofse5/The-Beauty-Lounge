'use client';

import Link from 'next/link';
import { useUsers } from './hooks/use-users';
import UsersTable from './components/users-table';
import AddUserModal from './components/add-user-modal';
import EditUserModal from './components/edit-user-modal';

export default function UserManagementPage() {
  const {
    user,
    authLoading,
    loading,
    error,
    success,
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
  } = useUsers();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <UsersTable
          filteredUsers={filteredUsers}
          onEdit={openEditModal}
          onDelete={handleDeleteUser}
        />
      </main>

      {showAddUserModal && (
        <AddUserModal
          isClosing={isModalClosing}
          formData={formData}
          formErrors={formErrors}
          roles={roles}
          practitionerRef={practitionerRef}
          onClose={closeModals}
          onSave={handleAddUser}
          onChange={setFormData}
          onClearError={(field) => setFormErrors({ ...formErrors, [field]: '' })}
        />
      )}

      {showUserModal && selectedUser && (
        <EditUserModal
          selectedUser={selectedUser}
          isClosing={isModalClosing}
          formData={formData}
          formErrors={formErrors}
          roles={roles}
          onClose={closeModals}
          onSave={handleEditUser}
          onChange={setFormData}
          onClearError={(field) => setFormErrors({ ...formErrors, [field]: '' })}
        />
      )}
    </div>
  );
}
