'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getServicesWithCategories, getCategories, formatPrice, formatDuration } from '@/lib/services'
import { ServiceWithCategory, Category } from '@/types'
import { supabase } from '@/lib/supabase'
import { ValidationService } from '@/lib/validation-service'
import { ValidationInput, ValidationTextarea, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'

interface ServiceFormData {
  name: string
  description: string
  duration_minutes: number
  price: number
  category_id: string
}

interface CategoryFormData {
  name: string
  description: string
  display_order: number
}

export default function AdminServicesPage() {
  const { user, loading: authLoading } = useAuth()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showServiceDetails, setShowServiceDetails] = useState(false)
  const [editingService, setEditingService] = useState<ServiceWithCategory | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [viewingService, setViewingService] = useState<ServiceWithCategory | null>(null)
  
  // Animation states
  const [isServiceModalClosing, setIsServiceModalClosing] = useState(false)
  const [isCategoryModalClosing, setIsCategoryModalClosing] = useState(false)
  const [isServiceDetailsClosing, setIsServiceDetailsClosing] = useState(false)
  
  // Form states
  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    category_id: ''
  })
  
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    display_order: 0
  })

  // Validation error states
  const [serviceFormErrors, setServiceFormErrors] = useState<{[key: string]: string}>({})
  const [categoryFormErrors, setCategoryFormErrors] = useState<{[key: string]: string}>({})

  // Load data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [servicesData, categoriesData] = await Promise.all([
        getServicesWithCategories(),
        getCategories()
      ])
      setServices(servicesData)
      setCategories(categoriesData)
    } catch (err) {
      setError('Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (message: string, isError = false) => {
    if (isError) {
      setError(message)
      setSuccess(null)
    } else {
      setSuccess(message)
      setError(null)
    }
    setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 3000)
  }

  // Animation helper functions
  const closeServiceDetails = () => {
    setIsServiceDetailsClosing(true)
    setTimeout(() => {
      setShowServiceDetails(false)
      setViewingService(null)
      setIsServiceDetailsClosing(false)
    }, 300)
  }

  const closeServiceModal = () => {
    setIsServiceModalClosing(true)
    setTimeout(() => {
      setShowServiceModal(false)
      setEditingService(null)
      resetServiceForm()
      setIsServiceModalClosing(false)
    }, 300)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalClosing(true)
    setTimeout(() => {
      setShowCategoryModal(false)
      setEditingCategory(null)
      resetCategoryForm()
      setIsCategoryModalClosing(false)
    }, 300)
  }

  // Service CRUD operations
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateServiceForm()) {
      return
    }
    
    try {
      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: serviceForm.name,
            description: serviceForm.description,
            duration_minutes: serviceForm.duration_minutes,
            price: serviceForm.price,
            category_id: serviceForm.category_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingService.id)

        if (error) throw error
        showMessage('Service updated successfully')
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert([{
            name: serviceForm.name,
            description: serviceForm.description,
            duration_minutes: serviceForm.duration_minutes,
            price: serviceForm.price,
            category_id: serviceForm.category_id,
            is_active: true,
            is_deleted: false
          }])

        if (error) throw error
        showMessage('Service created successfully')
      }

      setShowServiceModal(false)
      setEditingService(null)
      resetServiceForm()
      loadData()
    } catch (err) {
      showMessage('Failed to save service', true)
      console.error('Error saving service:', err)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_deleted: true, is_active: false })
        .eq('id', serviceId)

      if (error) throw error
      showMessage('Service deleted successfully')
      loadData()
    } catch (err) {
      showMessage('Failed to delete service', true)
      console.error('Error deleting service:', err)
    }
  }

  const handleViewService = (service: ServiceWithCategory) => {
    setViewingService(service)
    setShowServiceDetails(true)
  }

  const handleEditService = (service: ServiceWithCategory) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || 0,
      category_id: service.category_id || ''
    })
    setShowServiceModal(true)
  }

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      description: '',
      duration_minutes: 30,
      price: 0,
      category_id: ''
    })
    setServiceFormErrors({})
  }

  const validateServiceForm = (): boolean => {
    const result = ValidationService.validateForm(serviceForm, ValidationService.schemas.service)
    setServiceFormErrors(result.errors)
    return result.isValid
  }

  // Category CRUD operations
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCategoryForm()) {
      return
    }
    
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('service_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        showMessage('Category updated successfully')
      } else {
        // Create new category
        const { error } = await supabase
          .from('service_categories')
          .insert([{
            name: categoryForm.name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            color: '#6366f1',
            is_active: true,
            is_deleted: false
          }])

        if (error) throw error
        showMessage('Category created successfully')
      }

      setShowCategoryModal(false)
      setEditingCategory(null)
      resetCategoryForm()
      loadData()
    } catch (err) {
      showMessage('Failed to save category', true)
      console.error('Error saving category:', err)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Services in this category will become uncategorized.')) return

    try {
      const { error } = await supabase
        .from('service_categories')
        .update({ is_deleted: true, is_active: false })
        .eq('id', categoryId)

      if (error) throw error
      showMessage('Category deleted successfully')
      loadData()
    } catch (err) {
      showMessage('Failed to delete category', true)
      console.error('Error deleting category:', err)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order
    })
    setShowCategoryModal(true)
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: categories.length
    })
    setCategoryFormErrors({})
  }

  const validateCategoryForm = (): boolean => {
    const result = ValidationService.validateForm(categoryForm, ValidationService.schemas.category)
    setCategoryFormErrors(result.errors)
    return result.isValid
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You must be logged in to access this page.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              resetServiceForm()
              setEditingService(null)
              setShowServiceModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F2C7EB] hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Service
          </button>
          <button
            onClick={() => {
              resetCategoryForm()
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F6D5F0] hover:bg-[#F2C7EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Category
          </button>
        </div>

        {/* Categories Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Categories</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                      title="Edit category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                      title="Delete category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                )}
                <p className="text-xs text-gray-500">Order: {category.display_order}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {services.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-500 line-clamp-2">{service.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.category_name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(service.duration_minutes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(service.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                              title="Edit service"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                              title="Delete service"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                {/* Clickable area for viewing details */}
                <div
                  onClick={() => handleViewService(service)}
                  className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {service.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {service.category_name || 'Uncategorized'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(service.duration_minutes)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(service.price)}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => handleEditService(service)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100"
                      title="Edit service"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-gray-100"
                      title="Delete service"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop - invisible but clickable */}
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closeServiceModal}
          />
          
          {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
            isServiceModalClosing 
              ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
              : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                type="button"
                onClick={closeServiceModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={handleSaveService} className="space-y-4" id="service-form">
                <ValidationInput
                  label="Service Name"
                  required
                  error={serviceFormErrors.name}
                  value={serviceForm.name}
                  onChange={(e) => {
                    setServiceForm({ ...serviceForm, name: e.target.value })
                    if (serviceFormErrors.name) {
                      setServiceFormErrors({ ...serviceFormErrors, name: '' })
                    }
                  }}
                />

                <ValidationTextarea
                  label="Description"
                  error={serviceFormErrors.description}
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                />

                <ValidationInput
                  label="Duration (minutes)"
                  required
                  error={serviceFormErrors.duration_minutes}
                  type="number"
                  min="1"
                  value={serviceForm.duration_minutes}
                  onChange={(e) => {
                    setServiceForm({ ...serviceForm, duration_minutes: parseInt(e.target.value) || 0 })
                    if (serviceFormErrors.duration_minutes) {
                      setServiceFormErrors({ ...serviceFormErrors, duration_minutes: '' })
                    }
                  }}
                />

                <ValidationInput
                  label="Price"
                  required
                  error={serviceFormErrors.price}
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => {
                    setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) || 0 })
                    if (serviceFormErrors.price) {
                      setServiceFormErrors({ ...serviceFormErrors, price: '' })
                    }
                  }}
                />

                <ValidationSelect
                  label="Category"
                  required
                  error={serviceFormErrors.category_id}
                  value={serviceForm.category_id}
                  onValueChange={(value) => {
                    setServiceForm({ ...serviceForm, category_id: value })
                    if (serviceFormErrors.category_id) {
                      setServiceFormErrors({ ...serviceFormErrors, category_id: '' })
                    }
                  }}
                  placeholder="Select a category"
                >
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </ValidationSelect>
              </form>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeServiceModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="service-form"
                  className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                >
                  {editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Details Modal - Bottom Sheet */}
      {showServiceDetails && viewingService && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop - invisible but clickable */}
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closeServiceDetails}
          />
          
          {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
            isServiceDetailsClosing 
              ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
              : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Service Details
              </h3>
              <button
                onClick={closeServiceDetails}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-96 lg:max-h-80 overflow-y-auto">
              <div className="space-y-6">
                {/* Service Name */}
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    {viewingService.name}
                  </h4>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {viewingService.category_name || 'Uncategorized'}
                  </div>
                </div>

                {/* Description */}
                {viewingService.description && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {viewingService.description}
                    </p>
                  </div>
                )}

                {/* Duration and Price */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(viewingService.duration_minutes)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Duration</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">
                      {formatPrice(viewingService.price)}
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
                    closeServiceDetails()
                    // Delay the edit modal to allow close animation
                    setTimeout(() => handleEditService(viewingService), 100)
                  }}
                  className="flex-1 bg-[#F2C7EB] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#E8A8D8] transition-colors"
                >
                  Edit Service
                </button>
                <button
                  onClick={closeServiceDetails}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop - invisible but clickable */}
          <div 
            className="fixed inset-0 pointer-events-auto"
            onClick={closeCategoryModal}
          />
          
          {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-md bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] lg:max-h-[80vh] flex flex-col pointer-events-auto ${
            isCategoryModalClosing 
              ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]' 
              : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
          }`}>
            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={closeCategoryModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={handleSaveCategory} className="space-y-4" id="category-form">
                <ValidationInput
                  label="Category Name"
                  required
                  error={categoryFormErrors.name}
                  value={categoryForm.name}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                    if (categoryFormErrors.name) {
                      setCategoryFormErrors({ ...categoryFormErrors, name: '' })
                    }
                  }}
                />

                <ValidationTextarea
                  label="Description"
                  error={categoryFormErrors.description}
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />

                <ValidationInput
                  label="Display Order"
                  error={categoryFormErrors.display_order}
                  type="number"
                  min="0"
                  value={categoryForm.display_order}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })
                    if (categoryFormErrors.display_order) {
                      setCategoryFormErrors({ ...categoryFormErrors, display_order: '' })
                    }
                  }}
                />
              </form>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="category-form"
                  className="flex-1 bg-[#F6D5F0] text-gray-900 px-4 py-3 rounded-lg font-medium hover:bg-[#F2C7EB] transition-colors"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 