'use client';

import { useRoles } from './hooks/use-roles';
import RolesList from './components/roles-list';
import PermissionsList from './components/permissions-list';
import RoleModal from './components/role-modal';
import PermissionModal from './components/permission-modal';
import RolePermissionsModal from './components/role-permissions-modal';

export default function RolesPage() {
  const {
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
  } = useRoles();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F2C7EB] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roles and permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <RolesList
          roles={roles}
          onEdit={openRoleModal}
          onDelete={handleDeleteRole}
          onManagePermissions={openRolePermissionsModal}
        />

        <PermissionsList
          permissions={permissions}
          onEdit={openPermissionModal}
          onDelete={handleDeletePermission}
        />
      </main>

      {showRoleModal && (
        <RoleModal
          editingRole={editingRole}
          isClosing={isRoleModalClosing}
          roleForm={roleForm}
          roleFormErrors={roleFormErrors}
          onClose={closeRoleModal}
          onSave={handleSaveRole}
          onChange={setRoleForm}
          onClearError={(field) => setRoleFormErrors({ ...roleFormErrors, [field]: '' })}
        />
      )}

      {showPermissionModal && (
        <PermissionModal
          editingPermission={editingPermission}
          isClosing={isPermissionModalClosing}
          permissionForm={permissionForm}
          permissionFormErrors={permissionFormErrors}
          onClose={closePermissionModal}
          onSave={handleSavePermission}
          onChange={setPermissionForm}
          onClearError={(field) =>
            setPermissionFormErrors({ ...permissionFormErrors, [field]: '' })
          }
        />
      )}

      {showRolePermissionsModal && selectedRole && (
        <RolePermissionsModal
          selectedRole={selectedRole}
          permissions={permissions}
          selectedPermissions={selectedPermissions}
          onClose={closeRolePermissionsModal}
          onSave={handleSaveRolePermissions}
          onToggle={handlePermissionToggle}
        />
      )}
    </div>
  );
}
