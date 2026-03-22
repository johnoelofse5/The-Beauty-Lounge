import { ValidationInput } from '@/components/validation/ValidationComponents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminUser, AdminRole, UserFormData } from '@/types';

interface EditUserModalProps {
  selectedUser: AdminUser;
  isClosing: boolean;
  formData: UserFormData;
  formErrors: { [key: string]: string };
  roles: AdminRole[];
  onClose: () => void;
  onSave: () => void;
  onChange: (data: UserFormData) => void;
  onClearError: (field: string) => void;
}

export default function EditUserModal({
  isClosing,
  formData,
  formErrors,
  roles,
  onClose,
  onSave,
  onChange,
  onClearError,
}: EditUserModalProps) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-lg bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
          isClosing
            ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
            : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
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
            id="edit-user-form"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-500 bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ValidationInput
                label="First Name"
                required
                error={formErrors.first_name}
                type="text"
                value={formData.first_name}
                onChange={(e) => {
                  onChange({ ...formData, first_name: e.target.value });
                  onClearError('first_name');
                }}
              />
              <ValidationInput
                label="Last Name"
                required
                error={formErrors.last_name}
                type="text"
                value={formData.last_name}
                onChange={(e) => {
                  onChange({ ...formData, last_name: e.target.value });
                  onClearError('last_name');
                }}
              />
            </div>

            <ValidationInput
              label="Phone"
              required
              error={formErrors.phone}
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                onChange({ ...formData, phone: e.target.value });
                onClearError('phone');
              }}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <Select
                value={formData.role_id || ''}
                onValueChange={(value) => onChange({ ...formData, role_id: value || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 shadow-lg">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_practitioner}
                  onChange={(e) => onChange({ ...formData, is_practitioner: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Is Practitioner</span>
              </label>
            </div>
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
              form="edit-user-form"
              className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
            >
              Update User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
