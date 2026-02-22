import { ValidationInput, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { useServiceInventory } from '../hooks/use-service-inventory'
import ServiceInventoryModal from '../modals/service-inventory-modal'

interface Props {
  userId: string
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
}

export default function ServiceInventoryView({ userId, showSuccess, showError }: Props) {
  const {
    loading, services, inventoryItems, relationships,
    showAddModal, isAddModalClosing, editingRelationship, showEditModal, isEditModalClosing,
    addForm, editForm, addErrors, editErrors,
    searchTerm, setSearchTerm, selectedService, setSelectedService,
    openAddModal, closeAddModal, openEditModal, closeEditModal,
    updateAddField, updateEditField,
    handleAdd, handleUpdate, handleDelete
  } = useServiceInventory(userId, showError, showSuccess)

  if (loading && relationships.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Service Inventory Management</h2>
          <p className="text-sm text-gray-600">Manage which inventory items are used by which services</p>
        </div>
        <button onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Relationship
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ValidationInput label="Search Relationships" type="text" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} placeholder="Search by service or inventory item..." />
          <ValidationSelect label="Service" value={selectedService} onValueChange={setSelectedService}>
            <SelectItem value="all">All Services</SelectItem>
            {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </ValidationSelect>
        </div>
      </div>

      {/* Relationships list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Service Inventory Relationships</h3>
          <span className="text-sm text-gray-500">
            {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
          </span>
        </div>

        {relationships.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No relationships found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedService !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first service inventory relationship'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
            {relationships.map(rel => (
              <div key={rel.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{rel.service?.name}</h4>
                        <p className="text-xs text-gray-500">Service</p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{rel.inventory_item?.name}</h4>
                        <p className="text-xs text-gray-500">Inventory Item</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Quantity Used:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {rel.quantity_used} {rel.inventory_item?.unit_of_measure}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Category:</span>
                      <span className="text-sm font-medium text-gray-900">{rel.inventory_item?.category?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button onClick={() => openEditModal(rel)} title="Edit relationship"
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(rel.id)} title="Delete relationship"
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServiceInventoryModal
        mode="add"
        isOpen={showAddModal}
        isClosing={isAddModalClosing}
        onClose={closeAddModal}
        onSubmit={handleAdd}
        form={addForm}
        updateField={updateAddField}
        errors={addErrors}
        services={services}
        inventoryItems={inventoryItems}
        loading={loading}
      />

      {editingRelationship && (
        <ServiceInventoryModal
          mode="edit"
          isOpen={showEditModal}
          isClosing={isEditModalClosing}
          onClose={closeEditModal}
          onSubmit={handleUpdate}
          form={editForm}
          updateField={updateEditField}
          errors={editErrors}
          services={services}
          inventoryItems={inventoryItems}
          loading={loading}
        />
      )}
    </div>
  )
}