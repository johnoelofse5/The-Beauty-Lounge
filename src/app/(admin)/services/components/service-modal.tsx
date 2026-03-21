'use client';

import React from 'react';
import { Category, ServiceFormData, ServiceWithCategory } from '@/types';
import {
  ValidationInput,
  ValidationTextarea,
  ValidationSelect,
} from '@/components/validation/ValidationComponents';
import { SelectItem } from '@/components/ui/select';

interface Props {
  editingService: ServiceWithCategory | null;
  isClosing: boolean;
  serviceForm: ServiceFormData;
  serviceFormErrors: { [key: string]: string };
  categories: Category[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (form: ServiceFormData) => void;
  onErrorChange: (errors: { [key: string]: string }) => void;
}

export default function ServiceModal({
  editingService,
  isClosing,
  serviceForm,
  serviceFormErrors,
  categories,
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
            {editingService ? 'Edit Service' : 'Add New Service'}
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
          <form onSubmit={onSubmit} className="space-y-4" id="service-form">
            <ValidationInput
              label="Service Name"
              required
              error={serviceFormErrors.name}
              value={serviceForm.name}
              onChange={(e) => {
                onFormChange({ ...serviceForm, name: e.target.value });
                if (serviceFormErrors.name) {
                  onErrorChange({ ...serviceFormErrors, name: '' });
                }
              }}
            />

            <ValidationTextarea
              label="Description"
              error={serviceFormErrors.description}
              rows={3}
              value={serviceForm.description}
              onChange={(e) => onFormChange({ ...serviceForm, description: e.target.value })}
            />

            <ValidationInput
              label="Duration (minutes)"
              required
              error={serviceFormErrors.duration_minutes}
              type="number"
              min="1"
              value={serviceForm.duration_minutes}
              onChange={(e) => {
                onFormChange({ ...serviceForm, duration_minutes: parseInt(e.target.value) || 0 });
                if (serviceFormErrors.duration_minutes) {
                  onErrorChange({ ...serviceFormErrors, duration_minutes: '' });
                }
              }}
            />

            <ValidationInput
              label="Price"
              required
              error={serviceFormErrors.price}
              type="number"
              min="0"
              step="0.01"
              value={serviceForm.price}
              onChange={(e) => {
                onFormChange({ ...serviceForm, price: parseFloat(e.target.value) || 0 });
                if (serviceFormErrors.price) {
                  onErrorChange({ ...serviceFormErrors, price: '' });
                }
              }}
            />

            <ValidationSelect
              label="Category"
              required
              error={serviceFormErrors.category_id}
              value={serviceForm.category_id}
              onValueChange={(value) => {
                onFormChange({ ...serviceForm, category_id: value });
                if (serviceFormErrors.category_id) {
                  onErrorChange({ ...serviceFormErrors, category_id: '' });
                }
              }}
              placeholder="Select a category"
            >
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </ValidationSelect>
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
              form="service-form"
              className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
            >
              {editingService ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
