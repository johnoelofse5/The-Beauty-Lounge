'use client';

import { Role, Permission } from '@/types';

interface RolePermissionsModalProps {
  selectedRole: Role;
  permissions: Permission[];
  selectedPermissions: string[];
  onClose: () => void;
  onSave: () => void;
  onToggle: (permissionId: string) => void;
}

export default function RolePermissionsModal({
  selectedRole,
  permissions,
  selectedPermissions,
  onClose,
  onSave,
  onToggle,
}: RolePermissionsModalProps) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop">
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Manage Permissions for {selectedRole.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission.id)}
                  onChange={() => onToggle(permission.id)}
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
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
