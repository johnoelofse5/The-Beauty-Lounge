import {
    ValidationInput,
    ValidationSelect
} from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { useInventoryItems } from '../hooks/use-inventory-items'
import { formatCurrency } from '../utils/inventory-formatter'
import InventoryItemModal from '../modals/inventory-item-modal'

interface Props {
    showSuccess: (msg: string) => void
    showError: (msg: string) => void
}

export default function InventoryView({ showSuccess, showError }: Props) {
    const {
        loading, categories, filteredServices, items, measurements,
        showAddModal, isAddModalClosing, editingItem, showEditModal, isEditModalClosing,
        addForm, editForm, addErrors, editErrors,
        searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, sortBy, setSortBy,
        openAddModal, closeAddModal, openEditModal, closeEditModal,
        updateAddField, updateEditField,
        handleAddItem, handleUpdateItem, handleDeleteItem
    } = useInventoryItems(showError, showSuccess)

    if (loading && items.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
                    <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Management</h2>
                    <p className="text-sm text-gray-600">Manage your stock items and levels</p>
                </div>
                <button onClick={openAddModal}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Item
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ValidationInput label="Search Items" type="text" value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or SKU..." />
                    <ValidationSelect label="Category" value={selectedCategory}
                        onValueChange={setSelectedCategory} placeholder="All Categories">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </ValidationSelect>
                    <ValidationSelect label="Sort By" value={sortBy}
                        onValueChange={v => setSortBy(v as 'name' | 'stock' | 'value')}>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="stock">Stock Level</SelectItem>
                        <SelectItem value="value">Total Value</SelectItem>
                    </ValidationSelect>
                </div>
            </div>

            {/* Items grid */}
            {items.length === 0 ? (
                <EmptyState hasFilters={!!searchTerm || selectedCategory !== 'all'} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {items.map(item => {
                        const stockStatus =
                            item.current_stock === 0 ? { label: 'Out of Stock', cls: 'bg-red-100 text-red-800' }
                                : item.current_stock <= item.minimum_stock ? { label: 'Low Stock', cls: 'bg-yellow-100 text-yellow-800' }
                                    : { label: 'In Stock', cls: 'bg-green-100 text-green-800' }

                        return (
                            <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{item.name}</h3>
                                            {item.sku && <p className="text-xs sm:text-sm text-gray-500">SKU: {item.sku}</p>}
                                        </div>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${stockStatus.cls}`}>
                                            {stockStatus.label}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {[
                                            ['Current Stock', `${item.current_stock} ${item.unit_of_measure}`],
                                            ['Unit Cost', formatCurrency(item.unit_cost)],
                                            ['Total Value', formatCurrency(item.current_stock * item.unit_cost)],
                                            item.category ? ['Category', item.category.name] : null,
                                            item.supplier_name ? ['Supplier', item.supplier_name] : null
                                        ].filter((row): row is [string, string] => row !== null)
                                            .map(([label, value]) => (
                                                <div key={label} className="flex justify-between items-center">
                                                    <span className="text-xs sm:text-sm text-gray-600">{label}:</span>
                                                    <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">{value}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                                    <button onClick={() => openEditModal(item)} title="Edit item"
                                        className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleDeleteItem(item.id)} title="Delete item"
                                        className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-gray-100">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add modal */}
            <InventoryItemModal
                mode="add"
                isOpen={showAddModal}
                isClosing={isAddModalClosing}
                onClose={closeAddModal}
                onSubmit={handleAddItem}
                form={addForm}
                updateField={updateAddField}
                errors={addErrors}
                categories={categories}
                filteredServices={filteredServices}
                measurements={measurements}
                loading={loading}
            />

            {/* Edit modal */}
            {editingItem && (
                <InventoryItemModal
                    mode="edit"
                    isOpen={showEditModal}
                    isClosing={isEditModalClosing}
                    onClose={closeEditModal}
                    onSubmit={handleUpdateItem}
                    form={editForm}
                    updateField={updateEditField}
                    errors={editErrors}
                    categories={categories}
                    filteredServices={filteredServices}
                    measurements={measurements}
                    loading={loading}
                />
            )}
        </div>
    )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
    return (
        <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items found</h3>
            <p className="mt-1 text-sm text-gray-500">
                {hasFilters ? 'Try adjusting your search or filter criteria' : 'Get started by adding your first inventory item'}
            </p>
        </div>
    )
}

const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
const TrashIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>