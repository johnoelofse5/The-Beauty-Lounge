import { formatDateLocal, parseDateLocal } from '@/lib/date-utils'
import { ValidationInput, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import { FinancialTransactionForm } from '@/types/inventory'
import { Lookup } from '@/types/lookup'
import BottomSheetModal, { ModalFooterButtons } from './bottom-sheet-modal'

interface Props {
  mode: 'add' | 'edit'
  isOpen: boolean
  isClosing: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  form: FinancialTransactionForm
  updateField: (field: string, value: any) => void
  errors: Record<string, string>
  paymentMethods: Lookup[]
  revenueTypes: Lookup[]
  transactionTypes: Lookup[]
  loading: boolean
}

const FORM_ID = 'transaction-form'

export default function TransactionModal({
  mode, isOpen, isClosing, onClose, onSubmit,
  form, updateField, errors,
  paymentMethods, revenueTypes, transactionTypes, loading
}: Props) {
  if (!isOpen) return null

  return (
    <BottomSheetModal
      title={mode === 'add' ? 'Add Financial Transaction' : 'Edit Financial Transaction'}
      isClosing={isClosing}
      onClose={onClose}
      footer={
        <ModalFooterButtons
          onCancel={onClose}
          submitLabel={mode === 'add' ? 'Add Transaction' : 'Update Transaction'}
          loading={loading}
          formId={FORM_ID}
        />
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4 sm:space-y-6">

        {/* Type & Category */}
        <section>
          <h4 className="text-base font-medium text-gray-900 mb-3">Transaction Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidationSelect
              label="Transaction Type"
              value={form.transaction_type}
              onValueChange={v => updateField('transaction_type', v)}
              required
              error={errors.transaction_type}
              placeholder="Select transaction type"
            >
              {transactionTypes.map(t => (
                <SelectItem key={t.id} value={t.secondary_value || t.value}>{t.value}</SelectItem>
              ))}
            </ValidationSelect>

            <ValidationSelect
              label="Category"
              value={form.category}
              onValueChange={v => updateField('category', v)}
              required
              error={errors.category}
              placeholder="Select category"
            >
              {revenueTypes.map(t => (
                <SelectItem key={t.id} value={t.secondary_value || t.value}>{t.value}</SelectItem>
              ))}
            </ValidationSelect>
          </div>
        </section>

        {/* Amount & Date */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidationInput
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => updateField('amount', parseFloat(e.target.value) || 0)}
              required
              error={errors.amount}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                date={form.transaction_date ? parseDateLocal(form.transaction_date) : undefined}
                onDateChange={date => updateField('transaction_date', date ? formatDateLocal(date) : '')}
                placeholder="Select transaction date"
                allowSameDay
                allowPastDates
                className="w-full"
              />
              {errors.transaction_date && (
                <p className="text-sm text-red-600">{errors.transaction_date}</p>
              )}
            </div>
          </div>
        </section>

        {/* Payment Method & Receipt */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidationSelect
              label="Payment Method"
              value={form.payment_method || ''}
              onValueChange={v => updateField('payment_method', v)}
              placeholder="Select payment method"
            >
              {paymentMethods.map(m => (
                <SelectItem key={m.id} value={m.value}>{m.secondary_value}</SelectItem>
              ))}
            </ValidationSelect>

            <ValidationInput
              label="Receipt Number (Optional)"
              type="text"
              value={form.receipt_number}
              onChange={e => updateField('receipt_number', e.target.value)}
              placeholder="e.g., RCP-001"
            />
          </div>
        </section>
      </form>
    </BottomSheetModal>
  )
}