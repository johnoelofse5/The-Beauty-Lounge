'use client';

import { Role, InputWithErrorProps } from '@/types';

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
);

interface RoleModalProps {
  editingRole: Role | null;
  isClosing: boolean;
  roleForm: { name: string; description: string };
  roleFormErrors: { [key: string]: string };
  onClose: () => void;
  onSave: () => void;
  onChange: (form: { name: string; description: string }) => void;
  onClearError: (field: string) => void;
}

export default function RoleModal({
  editingRole,
  isClosing,
  roleForm,
  roleFormErrors,
  onClose,
  onSave,
  onChange,
  onClearError,
}: RoleModalProps) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
          isClosing
            ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
            : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingRole ? 'Edit Role' : 'Add New Role'}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className="space-y-4"
            id="role-form"
          >
            <InputWithError label="Role Name" required error={roleFormErrors.name}>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => {
                  onChange({ ...roleForm, name: e.target.value });
                  onClearError('name');
                }}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  roleFormErrors.name
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
            </InputWithError>

            <InputWithError label="Description" required error={roleFormErrors.description}>
              <textarea
                value={roleForm.description}
                onChange={(e) => {
                  onChange({ ...roleForm, description: e.target.value });
                  onClearError('description');
                }}
                rows={3}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  roleFormErrors.description
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
            </InputWithError>
          </form>
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
  );
}
