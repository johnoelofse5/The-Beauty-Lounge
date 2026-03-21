'use client';

import { ServiceWithCategory } from '@/types';
import { formatPrice, formatDuration } from '@/lib/services';

interface Props {
  service: ServiceWithCategory;
  isClosing: boolean;
  onClose: () => void;
  onEdit: (service: ServiceWithCategory) => void;
}

export default function ServiceDetailsModal({ service, isClosing, onClose, onEdit }: Props) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop - invisible but clickable */}
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
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
          <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
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

        {/* Content */}
        <div className="px-6 py-4 max-h-96 lg:max-h-80 overflow-y-auto">
          <div className="space-y-6">
            {/* Service Name */}
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h4>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {service.category_name || 'Uncategorized'}
              </div>
            </div>

            {/* Description */}
            {service.description && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
              </div>
            )}

            {/* Duration and Price */}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatDuration(service.duration_minutes)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Duration</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {formatPrice(service.price)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Price</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex space-x-3">
            <button
              onClick={() => {
                onClose();
                setTimeout(() => onEdit(service), 100);
              }}
              className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
            >
              Edit Service
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
