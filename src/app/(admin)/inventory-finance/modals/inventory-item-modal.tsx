import {
  ValidationInput,
  ValidationTextarea,
  ValidationSelect
} from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { Category } from '@/types/service-category'
import { ServiceWithCategory } from '@/types/service'
import { Lookup } from '@/types/lookup'
import { InventoryItemForm } from '@/types/inventory'
import BottomSheetModal, { ModalFooterButtons } from './bottom-sheet-modal'

interface Props {
  mode: 'add' | 'edit'
  isOpen: boolean
  isClosing: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  form: InventoryItemForm & { service_id?: string }
  updateField: (field: string, value: any) => void
  errors: Record<string, string>
  categories: Category[]
  filteredServices: ServiceWithCategory[]
  measurements: Lookup[]
  loading: boolean
}

const FORM_ID = 'inventory-item-form'

export default function InventoryItemModal({
  mode, isOpen, isClosing, onClose, onSubmit,
  form, updateField, errors,
  categories, filteredServices, measurements, loading
}: Props) {
  if (!isOpen) return null

  return (
    <BottomSheetModal
      title={mode === 'add' ? 'Add New Inventory Item' : 'Edit Inventory Item'}
      isClosing={isClosing}
      onClose={onClose}
      footer={
        <ModalFooterButtons
          onCancel={onClose}
          submitLabel={mode === 'add' ? 'Add Item' : 'Update Item'}
          loading={loading}
          formId={FORM_ID}
        />
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4 sm:space-y-6">

        {/* Basic Information */}
        <section>
          <h4 className="text-base font-medium text-gray-900 mb-3">Basic Information</h4>
          <div className="space-y-4">
            <ValidationInput
              label="Item Name"
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              required
              error={errors.name}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ValidationSelect
                label="Category"
                value={form.category_id}
                onValueChange={v => updateField('category_id', v)}
                placeholder="Select Category"
                required
                error={errors.category_id}
              >
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </ValidationSelect>

              <div className="relative">
                <ValidationSelect
                  label="Related Service (Optional)"
                  value={form.service_id || ''}
                  onValueChange={v => updateField('service_id', v)}
                  placeholder={
                    !form.category_id ? 'Select a category first'
                      : filteredServices.length === 0 ? 'No services available'
                        : 'Select Service (Optional)'
                  }
                  error={errors.service_id}
                >
                  {filteredServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} - R{s.price}</SelectItem>
                  ))}
                </ValidationSelect>
                {form.category_id && filteredServices.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No services found for the selected category</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Measurements & Quantity */}
        <section>
          <h4 className="text-base font-medium text-gray-900 mb-3">Measurements & Quantity</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ValidationSelect
              label="Unit of Measure"
              value={form.unit_of_measure}
              onValueChange={v => updateField('unit_of_measure', v)}
              error={errors.unit_of_measure}
            >
              {measurements.map(m => (
                <SelectItem key={m.id} value={m.value}>{m.secondary_value || m.value}</SelectItem>
              ))}
            </ValidationSelect>

            <ValidationInput
              label="Current Stock"
              type="number"
              min="0"
              value={form.current_stock.toString()}
              onChange={e => updateField('current_stock', parseInt(e.target.value) || 0)}
              placeholder="0"
              error={errors.current_stock}
            />
          </div>
        </section>

        {/* Pricing */}
        <section>
          <h4 className="text-base font-medium text-gray-900 mb-3">Pricing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidationInput
              label="Unit Cost (ZAR)"
              type="number"
              min="0"
              step="0.01"
              value={form.unit_cost.toString()}
              onChange={e => updateField('unit_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              error={errors.unit_cost}
            />
          </div>
        </section>

        {/* Description */}
        <section>
          <h4 className="text-base font-medium text-gray-900 mb-3">Additional Information</h4>
          <ValidationTextarea
            label="Description"
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
            rows={3}
            placeholder="Brief description of the item..."
            error={errors.description}
          />
        </section>
      </form>
    </BottomSheetModal>
  )
}