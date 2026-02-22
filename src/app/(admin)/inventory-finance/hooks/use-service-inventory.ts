import { useState, useEffect } from 'react'
import { InventoryService } from '@/lib/inventory-service'
import { getServicesWithCategories } from '@/lib/services'
import { InventoryItem, ServiceInventoryRelationship, ServiceInventoryRelationshipForm } from '@/types/inventory'
import { ServiceWithCategory } from '@/types/service'

const EMPTY_FORM: ServiceInventoryRelationshipForm = {
  service_id: '',
  inventory_item_id: '',
  quantity_used: 1
}

export function useServiceInventory(
  userId: string,
  showError: (msg: string) => void,
  showSuccess: (msg: string) => void
) {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [relationships, setRelationships] = useState<ServiceInventoryRelationship[]>([])

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<ServiceInventoryRelationship | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)

  // Form state
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState('all')

  const loadData = async () => {
    try {
      setLoading(true)
      const [svcs, itemsData, rels] = await Promise.all([
        getServicesWithCategories(),
        InventoryService.getItems(),
        InventoryService.getServiceInventoryRelationships()
      ])
      setServices(svcs)
      setInventoryItems(itemsData)
      setRelationships(rels)
    } catch (err) {
      console.error(err)
      showError('Failed to load service inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Modal helpers
  const openAddModal = () => { setAddForm({ ...EMPTY_FORM }); setAddErrors({}); setShowAddModal(true) }
  const closeAddModal = () => {
    setIsAddModalClosing(true)
    setTimeout(() => { setShowAddModal(false); setIsAddModalClosing(false); setAddErrors({}) }, 300)
  }

  const openEditModal = (rel: ServiceInventoryRelationship) => {
    setEditingRelationship(rel)
    setEditForm({ service_id: rel.service_id, inventory_item_id: rel.inventory_item_id, quantity_used: rel.quantity_used })
    setEditErrors({})
    setShowEditModal(true)
  }
  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => { setShowEditModal(false); setIsEditModalClosing(false); setEditingRelationship(null); setEditErrors({}) }, 300)
  }

  const updateAddField = (field: string, value: any) => {
    setAddForm(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) setAddErrors(prev => ({ ...prev, [field]: '' }))
  }
  const updateEditField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (form: typeof EMPTY_FORM, setErrors: (e: Record<string, string>) => void) => {
    const errors: Record<string, string> = {}
    if (!form.service_id) errors.service_id = 'Service is required'
    if (!form.inventory_item_id) errors.inventory_item_id = 'Inventory item is required'
    if (!form.quantity_used || form.quantity_used <= 0) errors.quantity_used = 'Quantity must be greater than 0'
    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(addForm, setAddErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.createServiceInventoryRelationship(addForm, userId)
      showSuccess('Service inventory relationship added successfully!')
      closeAddModal()
      await loadData()
    } catch (err) { console.error(err); showError('Failed to add service inventory relationship') }
    finally { setLoading(false) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRelationship || !validate(editForm, setEditErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.updateServiceInventoryRelationship(editingRelationship.id, editForm, userId)
      showSuccess('Service inventory relationship updated successfully!')
      closeEditModal()
      await loadData()
    } catch (err) { console.error(err); showError('Failed to update service inventory relationship') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service inventory relationship?')) return
    try {
      setLoading(true)
      await InventoryService.deleteServiceInventoryRelationship(id)
      showSuccess('Service inventory relationship deleted successfully!')
      await loadData()
    } catch (err) { console.error(err); showError('Failed to delete service inventory relationship') }
    finally { setLoading(false) }
  }

  const filteredRelationships = relationships.filter(rel => {
    const matchSearch = rel.service?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rel.inventory_item?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchService = selectedService === 'all' || rel.service_id === selectedService
    return matchSearch && matchService
  })

  return {
    loading, services, inventoryItems, relationships: filteredRelationships,
    showAddModal, isAddModalClosing, editingRelationship, showEditModal, isEditModalClosing,
    addForm, editForm, addErrors, editErrors,
    searchTerm, setSearchTerm, selectedService, setSelectedService,
    openAddModal, closeAddModal, openEditModal, closeEditModal,
    updateAddField, updateEditField,
    handleAdd, handleUpdate, handleDelete
  }
}