import { ValidationInput, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { ServiceInventoryRelationshipForm, InventoryItem } from '@/types/inventory'
import { ServiceWithCategory } from '@/types/service'
import BottomSheetModal, { ModalFooterButtons } from './bottom-sheet-modal'

interface Props {
  mode: 'add' | 'edit'
  isOpen: boolean
  isClosing: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  form: ServiceInventoryRelationshipForm
  updateField: (field: string, value: any) => void
  errors: Record<string, string>
  services: ServiceWithCategory[]
  inventoryItems: InventoryItem[]
  loading: boolean
}

const FORM_ID = 'service-inventory-form'

export default function ServiceInventoryModal({
  mode, isOpen, isClosing, onClose, onSubmit,
  form, updateField, errors,
  services, inventoryItems, loading
}: Props) {
  if (!isOpen) return null

  return (
    <BottomSheetModal
      title={mode === 'add' ? 'Add Service Inventory Relationship' : 'Edit Service Inventory Relationship'}
      isClosing={isClosing}
      onClose={onClose}
      footer={
        <ModalFooterButtons
          onCancel={onClose}
          submitLabel={mode === 'add' ? 'Add Relationship' : 'Update Relationship'}
          loading={loading}
          formId={FORM_ID}
        />
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        <ValidationSelect
          label="Service"
          value={form.service_id}
          onValueChange={v => updateField('service_id', v)}
          placeholder="Select Service"
          required
          error={errors.service_id}
        >
          {services.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name} - R{s.price}</SelectItem>
          ))}
        </ValidationSelect>

        <ValidationSelect
          label="Inventory Item"
          value={form.inventory_item_id}
          onValueChange={v => updateField('inventory_item_id', v)}
          placeholder="Select Inventory Item"
          required
          error={errors.inventory_item_id}
        >
          {inventoryItems.map(item => (
            <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit_of_measure})</SelectItem>
          ))}
        </ValidationSelect>

        <ValidationInput
          label="Quantity Used"
          type="number"
          min="1"
          value={form.quantity_used.toString()}
          onChange={e => updateField('quantity_used', parseInt(e.target.value) || 1)}
          placeholder="1"
          required
          error={errors.quantity_used}
        />
      </form>
    </BottomSheetModal>
  )
}