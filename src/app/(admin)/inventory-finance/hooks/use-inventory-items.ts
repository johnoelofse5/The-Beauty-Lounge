import { useState, useEffect } from 'react'
import { InventoryService } from '@/lib/inventory-service'
import { getCategories, getServicesWithCategories } from '@/lib/services'
import { lookupServiceCached } from '@/lib/lookup-service-cached'
import { InventoryItem, InventoryItemForm } from '@/types/inventory'
import { ServiceWithCategory } from '@/types/service'
import { Category } from '@/types/service-category'
import { Lookup } from '@/types/lookup'

const EMPTY_FORM: InventoryItemForm & { service_id?: string } = {
  category_id: '',
  service_id: '',
  name: '',
  description: '',
  unit_of_measure: 'unit',
  current_stock: 0,
  maximum_stock: undefined,
  unit_cost: 0
}

export function useInventoryItems(
  showError: (msg: string) => void,
  showSuccess: (msg: string) => void
) {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceWithCategory[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [measurements, setMeasurements] = useState<Lookup[]>([])

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)

  // Form state
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Filter/sort state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')

  const loadData = async () => {
    try {
      setLoading(true)
      const [cats, svcs, itemsData, measures] = await Promise.all([
        getCategories(),
        getServicesWithCategories(),
        InventoryService.getItems(),
        lookupServiceCached.getMeasurements()
      ])
      setCategories(cats)
      setServices(svcs)
      setItems(itemsData)
      setMeasurements(measures || [])
    } catch (err) {
      console.error('Error loading inventory data:', err)
      showError('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Sync filtered services when category changes in add form
  useEffect(() => {
    if (addForm.category_id) {
      const catName = categories.find(c => c.id === addForm.category_id)?.name
      setFilteredServices(catName ? services.filter(s => s.category_name === catName) : [])
    } else {
      setFilteredServices([])
    }
    setAddForm(prev => ({ ...prev, service_id: '' }))
  }, [addForm.category_id, categories, services])

  // Modal helpers
  const openAddModal = () => { setAddForm({ ...EMPTY_FORM }); setAddErrors({}); setShowAddModal(true) }
  const closeAddModal = () => {
    setIsAddModalClosing(true)
    setTimeout(() => { setShowAddModal(false); setIsAddModalClosing(false); setAddErrors({}) }, 300)
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setEditForm({
      category_id: item.category_id,
      service_id: item.service_id || '',
      name: item.name,
      description: item.description || '',
      unit_of_measure: item.unit_of_measure,
      current_stock: item.current_stock,
      maximum_stock: item.maximum_stock,
      unit_cost: item.unit_cost
    })
    setEditErrors({})
    setShowEditModal(true)
  }
  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => { setShowEditModal(false); setIsEditModalClosing(false); setEditingItem(null); setEditErrors({}) }, 300)
  }

  // Field updaters
  const updateAddField = (field: string, value: any) => {
    setAddForm(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) setAddErrors(prev => ({ ...prev, [field]: '' }))
  }
  const updateEditField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: '' }))
  }

  // Validation
  const validateForm = (form: typeof EMPTY_FORM, setErrors: (e: Record<string, string>) => void) => {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Item name is required'
    if (!form.category_id) errors.category_id = 'Category is required'
    if (form.current_stock < 0) errors.current_stock = 'Current stock cannot be negative'
    if (form.unit_cost < 0) errors.unit_cost = 'Unit cost cannot be negative'
    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  // CRUD
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm(addForm, setAddErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.createItem(addForm)
      showSuccess('Inventory item added successfully!')
      closeAddModal()
      await loadData()
    } catch (err) {
      console.error(err)
      showError('Failed to add inventory item')
    } finally { setLoading(false) }
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !validateForm(editForm, setEditErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.updateItem(editingItem.id, editForm)
      showSuccess('Inventory item updated successfully!')
      closeEditModal()
      await loadData()
    } catch (err) {
      console.error(err)
      showError('Failed to update inventory item')
    } finally { setLoading(false) }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return
    try {
      setLoading(true)
      await InventoryService.deleteItem(itemId)
      showSuccess('Inventory item deleted successfully!')
      await loadData()
    } catch (err) {
      console.error(err)
      showError('Failed to delete inventory item')
    } finally { setLoading(false) }
  }

  // Derived: filtered + sorted items
  const filteredItems = items
    .filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory
      return matchSearch && matchCat
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stock') return b.current_stock - a.current_stock
      return (b.current_stock * b.unit_cost) - (a.current_stock * a.unit_cost)
    })

  return {
    loading, categories, services, filteredServices, items: filteredItems, measurements,
    showAddModal, isAddModalClosing, editingItem, showEditModal, isEditModalClosing,
    addForm, editForm, addErrors, editErrors,
    searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, sortBy, setSortBy,
    openAddModal, closeAddModal, openEditModal, closeEditModal,
    updateAddField, updateEditField,
    handleAddItem, handleUpdateItem, handleDeleteItem
  }
}