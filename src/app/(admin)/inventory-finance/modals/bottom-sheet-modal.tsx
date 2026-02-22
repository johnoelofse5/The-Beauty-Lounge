import { ReactNode } from 'react'

interface Props {
  title: string
  isClosing: boolean
  onClose: () => void
  footer: ReactNode
  children: ReactNode
  zIndex?: string
}

export default function BottomSheetModal({
  title,
  isClosing,
  onClose,
  footer,
  children,
  zIndex = 'z-[60]'
}: Props) {
  return (
    <div className={`fixed inset-0 ${zIndex} pointer-events-none`}>
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
          isClosing
            ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
            : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
          {children}
        </div>

        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl">
          {footer}
        </div>
      </div>
    </div>
  )
}

export function ModalFooterButtons({
  onCancel,
  submitLabel,
  loading,
  formId
}: {
  onCancel: () => void
  submitLabel: string
  loading?: boolean
  formId: string
}) {
  return (
    <>
      <button type="button" onClick={onCancel}
        className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors">
        Cancel
      </button>
      <button type="submit" form={formId} disabled={loading}
        className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </>
  )
}