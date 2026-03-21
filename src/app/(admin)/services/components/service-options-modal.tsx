'use client';

import React from 'react';
import { ServiceWithCategory } from '@/types';
import { ServiceOption, ServiceOptionFormData } from '@/types/service-option';
import { formatPriceAdjustment } from '@/lib/services';

interface Props {
  service: ServiceWithCategory;
  optionsList: ServiceOption[];
  editingOption: ServiceOption | null;
  optionForm: ServiceOptionFormData;
  showOptionForm: boolean;
  loading: boolean;
  onClose: () => void;
  onSaveOption: (e: React.FormEvent) => void;
  onDeleteOption: (optionId: string) => void;
  onEditOption: (option: ServiceOption) => void;
  onShowAddForm: () => void;
  onCancelForm: () => void;
  onFormChange: (form: ServiceOptionFormData) => void;
}

export default function ServiceOptionsModal({
  service,
  optionsList,
  editingOption,
  optionForm,
  showOptionForm,
  loading,
  onClose,
  onSaveOption,
  onDeleteOption,
  onEditOption,
  onShowAddForm,
  onCancelForm,
  onFormChange,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-lg bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] flex flex-col pointer-events-auto">
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Service Options</h3>
            <p className="text-sm text-gray-500">{service.name}</p>
          </div>
          <button
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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {optionsList.length === 0 && !showOptionForm && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No options yet. Add one below.
                </p>
              )}
              <div className="space-y-2">
                {optionsList.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.name}</p>
                      {opt.description && (
                        <p className="text-xs text-gray-500">{opt.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-1">
                        <span
                          className={`text-xs font-semibold ${opt.price_adjustment > 0 ? 'text-amber-700' : opt.price_adjustment < 0 ? 'text-green-700' : 'text-gray-500'}`}
                        >
                          {formatPriceAdjustment(opt.price_adjustment)}
                        </span>
                        {opt.duration_adjustment_minutes !== 0 && (
                          <span className="text-xs text-gray-500">
                            {opt.duration_adjustment_minutes > 0 ? '+' : ''}
                            {opt.duration_adjustment_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-3">
                      <button
                        onClick={() => onEditOption(opt)}
                        className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteOption(opt.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showOptionForm && (
                <form
                  onSubmit={onSaveOption}
                  className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-3"
                >
                  <h4 className="text-sm font-semibold text-indigo-800">
                    {editingOption ? 'Edit Option' : 'New Option'}
                  </h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={optionForm.name}
                      onChange={(e) => onFormChange({ ...optionForm, name: e.target.value })}
                      placeholder="e.g. Extra Length"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={optionForm.description}
                      onChange={(e) => onFormChange({ ...optionForm, description: e.target.value })}
                      placeholder="Optional description"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price adjustment (ZAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={optionForm.price_adjustment}
                        onChange={(e) =>
                          onFormChange({
                            ...optionForm,
                            price_adjustment: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Use 0 for no change</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration adjustment (min)
                      </label>
                      <input
                        type="number"
                        value={optionForm.duration_adjustment_minutes}
                        onChange={(e) =>
                          onFormChange({
                            ...optionForm,
                            duration_adjustment_minutes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Use 0 for no change</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      {editingOption ? 'Update' : 'Add Option'}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelForm}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {!showOptionForm && (
            <button
              onClick={onShowAddForm}
              className="w-full bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
            >
              + Add Option
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
