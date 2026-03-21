'use client';

import React from 'react';
import { Category, CategoryFormData } from '@/types';
import { ValidationInput, ValidationTextarea } from '@/components/validation/ValidationComponents';

interface Props {
  editingCategory: Category | null;
  isClosing: boolean;
  categoryForm: CategoryFormData;
  categoryFormErrors: { [key: string]: string };
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (form: CategoryFormData) => void;
  onErrorChange: (errors: { [key: string]: string }) => void;
}

export default function CategoryModal({
  editingCategory,
  isClosing,
  categoryForm,
  categoryFormErrors,
  onClose,
  onSubmit,
  onFormChange,
  onErrorChange,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop - invisible but clickable */}
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
          isClosing
            ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
            : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
        }`}
      >
        {/* Handle bar (Mobile only) */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingCategory ? 'Edit Category' : 'Add New Category'}
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

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={onSubmit} className="space-y-4" id="category-form">
            <ValidationInput
              label="Category Name"
              required
              error={categoryFormErrors.name}
              value={categoryForm.name}
              onChange={(e) => {
                onFormChange({ ...categoryForm, name: e.target.value });
                if (categoryFormErrors.name) {
                  onErrorChange({ ...categoryFormErrors, name: '' });
                }
              }}
            />

            <ValidationTextarea
              label="Description"
              error={categoryFormErrors.description}
              rows={3}
              value={categoryForm.description}
              onChange={(e) => onFormChange({ ...categoryForm, description: e.target.value })}
            />

            <ValidationInput
              label="Display Order"
              error={categoryFormErrors.display_order}
              type="number"
              min="0"
              value={categoryForm.display_order}
              onChange={(e) => {
                onFormChange({ ...categoryForm, display_order: parseInt(e.target.value) || 0 });
                if (categoryFormErrors.display_order) {
                  onErrorChange({ ...categoryFormErrors, display_order: '' });
                }
              }}
            />
          </form>
        </div>

        {/* Actions */}
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
              form="category-form"
              className="flex-1 bg-[#F6D5F0] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#F2C7EB] transition-colors"
            >
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
