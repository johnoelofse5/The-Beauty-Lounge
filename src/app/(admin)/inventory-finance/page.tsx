'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { InventoryService } from '@/lib/inventory-service'
import { getCategories, getServicesWithCategories } from '@/lib/services'
import {
  InventorySummary,
  FinancialSummary,
  InventoryItem,
  FinancialTransaction,
  FinancialTransactionForm,
  LowStockItem,
  InventoryItemForm,
  ServiceInventoryRelationship,
  ServiceInventoryRelationshipForm
} from '@/types/inventory'
import { ServiceWithCategory } from '@/types/service'
import { Category } from '@/types/service-category'
import { lookupServiceCached } from '@/lib/lookup-service-cached'
import { Lookup } from '@/types/lookup'
import { 
  ValidationInput, 
  ValidationTextarea, 
  ValidationSelect,
  useValidation 
} from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'

export default function InventoryFinancePage() {
  const { user, userRoleData } = useAuth()
  const { showSuccess, showError } = useToast()
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'service-inventory' | 'purchases' | 'finances'>('dashboard')
  const [loading, setLoading] = useState(true)
  
  // Dashboard data
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  
  // Check permissions
  const hasAccess = userRoleData?.role?.name === 'super_admin' || userRoleData?.role?.name === 'practitioner'

  useEffect(() => {
    if (user && hasAccess) {
      loadDashboardData()
    }
  }, [user, hasAccess])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [inventory, financial, lowStock] = await Promise.all([
        InventoryService.getInventorySummary(),
        InventoryService.getFinancialSummary(),
        InventoryService.getLowStockItems()
      ])
      
      setInventorySummary(inventory)
      setFinancialSummary(financial)
      setLowStockItems(lowStock)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      showError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to access inventory and financial management.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Inventory & Financial Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your stock, track purchases, and monitor financial performance
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex -mb-px space-x-8">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                { key: 'inventory', label: 'Inventory', icon: '📦' },
                { key: 'service-inventory', label: 'Service Inventory', icon: '🔗' },
                { key: 'finances', label: 'Financial Transactions', icon: '💰' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Navigation - Horizontal Scroll */}
            <div className="sm:hidden -mb-px overflow-x-auto scrollbar-hide">
              <nav className="flex space-x-1 min-w-max px-4">
                {[
                  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { key: 'inventory', label: 'Inventory', icon: '📦' },
                  { key: 'service-inventory', label: 'Service Inventory', icon: '🔗' },
                  { key: 'finances', label: 'Financial Transactions', icon: '💰' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`${
                      activeTab === tab.key
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    } flex-shrink-0 py-3 px-4 border-b-2 font-medium text-sm flex flex-col items-center space-y-1 min-w-[120px] rounded-t-lg transition-all duration-200`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-xs leading-tight text-center">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            inventorySummary={inventorySummary}
            financialSummary={financialSummary}
            lowStockItems={lowStockItems}
            loading={loading}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            showSuccess={showSuccess}
            showError={showError}
            formatCurrency={formatCurrency}
            userRoleData={userRoleData}
          />
        )}

        {activeTab === 'service-inventory' && (
          <ServiceInventoryView
            user={user}
            showSuccess={showSuccess}
            showError={showError}
            formatCurrency={formatCurrency}
            userRoleData={userRoleData}
          />
        )}

        {activeTab === 'purchases' && (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
            <p className="text-gray-500">Coming soon - Create and manage purchase orders</p>
          </div>
        )}

        {activeTab === 'finances' && (
          <FinancialTransactionsView 
            user={user}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}
      </div>
    </div>
  )
}

// Dashboard View Component
function DashboardView({
  inventorySummary,
  financialSummary,
  lowStockItems,
  loading,
  formatCurrency
}: {
  inventorySummary: InventorySummary | null
  financialSummary: FinancialSummary | null
  lowStockItems: LowStockItem[]
  loading: boolean
  formatCurrency: (amount: number) => string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Inventory Value */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Inventory Value</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                {formatCurrency(inventorySummary?.total_value || 0)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-600">
              {inventorySummary?.total_items || 0} items in stock
            </p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-green-100 text-green-600 flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Monthly Revenue</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                {formatCurrency(financialSummary?.monthly_revenue || 0)}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Profit: {formatCurrency(financialSummary?.monthly_profit || 0)}
            </p>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-red-100 text-red-600 flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Monthly Expenses</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                {formatCurrency(financialSummary?.monthly_expenses || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Low Stock Items</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                {inventorySummary?.low_stock_items || 0}
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-600">
              {inventorySummary?.categories_count || 0} categories
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Low Stock Alert</h3>
            <p className="text-xs sm:text-sm text-gray-600">Items that need restocking</p>
          </div>
          
          {/* Mobile View - Cards */}
          <div className="sm:hidden">
            <div className="divide-y divide-gray-200">
              {lowStockItems.map((item) => (
                <div key={item.item_id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
                      {item.item_name}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                      item.current_stock === 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Current Stock</p>
                      <p className="text-sm font-medium text-gray-900">{item.current_stock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Minimum Stock</p>
                      <p className="text-sm font-medium text-gray-900">{item.minimum_stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop View - Table */}
          <div className="hidden sm:block p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Minimum Stock
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.map((item) => (
                    <tr key={item.item_id}>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.current_stock}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.minimum_stock}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.current_stock === 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Monthly Financial Overview</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
                <span className="text-xs sm:text-sm font-medium text-green-600 truncate ml-2">
                  {formatCurrency(financialSummary?.monthly_revenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Expenses</span>
                <span className="text-xs sm:text-sm font-medium text-red-600 truncate ml-2">
                  {formatCurrency(financialSummary?.monthly_expenses || 0)}
                </span>
              </div>
              <div className="border-t pt-3 sm:pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-medium text-gray-900">Net Profit</span>
                  <span className={`text-sm sm:text-base font-medium truncate ml-2 ${
                    (financialSummary?.monthly_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(financialSummary?.monthly_profit || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Yearly Financial Overview</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
                <span className="text-xs sm:text-sm font-medium text-green-600 truncate ml-2">
                  {formatCurrency(financialSummary?.yearly_revenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Expenses</span>
                <span className="text-xs sm:text-sm font-medium text-red-600 truncate ml-2">
                  {formatCurrency(financialSummary?.yearly_expenses || 0)}
                </span>
              </div>
              <div className="border-t pt-3 sm:pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-medium text-gray-900">Net Profit</span>
                  <span className={`text-sm sm:text-base font-medium truncate ml-2 ${
                    (financialSummary?.yearly_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(financialSummary?.yearly_profit || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inventory View Component
function InventoryView({
  showSuccess,
  showError,
  formatCurrency,
  userRoleData
}: {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  formatCurrency: (amount: number) => string
  userRoleData: any
}) {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceWithCategory[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [measurements, setMeasurements] = useState<Lookup[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')

  // Form state for adding new items
  const [formData, setFormData] = useState<InventoryItemForm & { service_id?: string }>({
    category_id: '',
    service_id: '',
    name: '',
    description: '',
    unit_of_measure: 'unit',
    current_stock: 0,
    maximum_stock: undefined,
    unit_cost: 0,
  })

  // Form state for editing items
  const [editFormData, setEditFormData] = useState<InventoryItemForm & { service_id?: string }>({
    category_id: '',
    service_id: '',
    name: '',
    description: '',
    unit_of_measure: 'unit',
    current_stock: 0,
    maximum_stock: undefined,
    unit_cost: 0,
  })

  // Form errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})

  // Clear error when field is updated
  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Clear error when edit field is updated
  const updateEditFormField = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Modal handlers
  const openAddModal = () => {
    setShowAddModal(true)
    setIsAddModalClosing(false)
  }

  const closeAddModal = () => {
    setIsAddModalClosing(true)
    setTimeout(() => {
      setShowAddModal(false)
      setIsAddModalClosing(false)
      setFormErrors({})
    }, 300)
  }

  // Edit modal handlers
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setEditFormData({
      category_id: item.category_id,
      service_id: item.service_id || '',
      name: item.name,
      description: item.description || '',
      unit_of_measure: item.unit_of_measure,
      current_stock: item.current_stock,
      maximum_stock: item.maximum_stock,
      unit_cost: item.unit_cost,
    })
    setShowEditModal(true)
    setIsEditModalClosing(false)
  }

  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => {
      setShowEditModal(false)
      setIsEditModalClosing(false)
      setEditingItem(null)
      setEditFormErrors({})
    }, 300)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesData, servicesData, itemsData, measurementsData] = await Promise.all([
        getCategories(),
        getServicesWithCategories(),
        InventoryService.getItems(),
        lookupServiceCached.getMeasurements()
      ])
      setCategories(categoriesData)
      setServices(servicesData)
      setItems(itemsData)
      setMeasurements(measurementsData || [])
    } catch (error) {
      console.error('Error loading inventory data:', error)
      showError('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  // Effect to filter services when category changes
  useEffect(() => {
    if (formData.category_id) {
      const categoryName = categories.find(cat => cat.id === formData.category_id)?.name
      if (categoryName) {
        // Filter services by category name
        const categoryServices = services.filter(service => 
          service.category_name === categoryName
        )
        setFilteredServices(categoryServices)
      } else {
        setFilteredServices([])
      }
    } else {
      setFilteredServices([])
    }
    // Clear service selection when category changes
    setFormData(prev => ({ ...prev, service_id: '' }))
  }, [formData.category_id, categories, services])

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Item name is required'
    }
    if (!formData.category_id) {
      errors.category_id = 'Category is required'
    }
    if (formData.current_stock < 0) {
      errors.current_stock = 'Current stock cannot be negative'
    }
    if (formData.unit_cost < 0) {
      errors.unit_cost = 'Unit cost cannot be negative'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please fix the errors in the form')
      return
    }

    try {
      setLoading(true)
      await InventoryService.createItem(formData)
      showSuccess('Inventory item added successfully!')
      closeAddModal()
      setFormData({
        category_id: '',
        service_id: '',
        name: '',
        description: '',
        unit_of_measure: 'unit',
        current_stock: 0,
        maximum_stock: undefined,
        unit_cost: 0,
      })
      setFormErrors({})
      await loadData()
    } catch (error) {
      console.error('Error adding item:', error)
      showError('Failed to add inventory item')
    } finally {
      setLoading(false)
    }
  }

  // Update item function
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingItem) return

    try {
      setLoading(true)
      await InventoryService.updateItem(editingItem.id, editFormData)
      showSuccess('Inventory item updated successfully!')
      closeEditModal()
      await loadData()
    } catch (error) {
      console.error('Error updating item:', error)
      showError('Failed to update inventory item')
    } finally {
      setLoading(false)
    }
  }

  // Delete item function
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
      return
    }

    try {
      setLoading(true)
      await InventoryService.deleteItem(itemId)
      showSuccess('Inventory item deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Error deleting item:', error)
      showError('Failed to delete inventory item')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || item.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'stock':
        return b.current_stock - a.current_stock
      case 'value':
        return (b.current_stock * b.unit_cost) - (a.current_stock * a.unit_cost)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ValidationInput
            label="Search Items"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or SKU..."
          />
          <ValidationSelect
            label="Category"
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value)}
            placeholder="All Categories"
          >
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </ValidationSelect>

          <ValidationSelect
            label="Sort By"
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'name' | 'stock' | 'value')}
          >
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="stock">Stock Level</SelectItem>
            <SelectItem value="value">Total Value</SelectItem>
          </ValidationSelect>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {sortedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  {item.sku && (
                    <p className="text-xs sm:text-sm text-gray-500">SKU: {item.sku}</p>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                  item.current_stock === 0
                    ? 'bg-red-100 text-red-800'
                    : item.current_stock <= item.minimum_stock
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {item.current_stock === 0
                    ? 'Out of Stock'
                    : item.current_stock <= item.minimum_stock
                    ? 'Low Stock'
                    : 'In Stock'
                  }
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Current Stock:</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {item.current_stock} {item.unit_of_measure}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Unit Cost:</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {formatCurrency(item.unit_cost)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Total Value:</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {formatCurrency(item.current_stock * item.unit_cost)}
                  </span>
                </div>

                {item.category && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Category:</span>
                    <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                      {item.category.name}
                    </span>
                  </div>
                )}

                {item.supplier_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Supplier:</span>
                    <span className="text-xs sm:text-sm text-gray-900 truncate ml-2">
                      {item.supplier_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => openEditModal(item)}
                  className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100"
                  title="Edit item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-gray-100"
                  title="Delete item"
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

      {sortedItems.length === 0 && (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || (selectedCategory && selectedCategory !== 'all')
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first inventory item'}
          </p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          {/* Backdrop - invisible but blocks clicks */}
          <div 
            className="absolute inset-0 pointer-events-auto" 
            onClick={closeAddModal}
          />
          
          {/* Modal Content */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isAddModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Inventory Item</h3>
              <button
                onClick={closeAddModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
              <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-4">
                    <ValidationInput
                      label="Item Name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      required
                      error={formErrors.name}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ValidationSelect
                        label="Category"
                        value={formData.category_id}
                        onValueChange={(value) => updateFormField('category_id', value)}
                        placeholder="Select Category"
                        required
                        error={formErrors.category_id}
                      >
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </ValidationSelect>

                      <div className="relative">
                        <ValidationSelect
                          label="Related Service (Optional)"
                          value={formData.service_id || ''}
                          onValueChange={(value) => updateFormField('service_id', value)}
                          placeholder={
                            !formData.category_id 
                              ? 'Select a category first' 
                              : filteredServices.length === 0 
                              ? 'No services available' 
                              : 'Select Service (Optional)'
                          }
                          error={formErrors.service_id}
                        >
                          {filteredServices.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - R{service.price}
                            </SelectItem>
                          ))}
                        </ValidationSelect>
                        {formData.category_id && filteredServices.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            No services found for the selected category
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Measurements & Quantity */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Measurements & Quantity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ValidationSelect
                      label="Unit of Measure"
                      value={formData.unit_of_measure}
                      onValueChange={(value) => updateFormField('unit_of_measure', value)}
                      error={formErrors.unit_of_measure}
                    >
                      {measurements.map((measurement) => (
                        <SelectItem key={measurement.id} value={measurement.value}>
                          {measurement.secondary_value || measurement.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationInput
                      label="Current Stock"
                      type="number"
                      min="0"
                      value={formData.current_stock.toString()}
                      onChange={(e) => updateFormField('current_stock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      error={formErrors.current_stock}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationInput
                      label="Unit Cost (ZAR)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost.toString()}
                      onChange={(e) => updateFormField('unit_cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      error={formErrors.unit_cost}
                    />
                  </div>
                </div>

                {/* Description & Notes */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="space-y-4">
                    <ValidationTextarea
                      label="Description"
                      value={formData.description}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      rows={3}
                      placeholder="Brief description of the item..."
                      error={formErrors.description}
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeAddModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-item-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          {/* Backdrop - invisible but blocks clicks */}
          <div 
            className="absolute inset-0 pointer-events-auto" 
            onClick={closeEditModal}
          />
          
          {/* Modal Content */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isEditModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Inventory Item</h3>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
              <form id="edit-item-form" onSubmit={handleUpdateItem} className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-4">
                    <ValidationInput
                      label="Item Name"
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => updateEditFormField('name', e.target.value)}
                      required
                      error={editFormErrors.name}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ValidationSelect
                        label="Category"
                        value={editFormData.category_id}
                        onValueChange={(value) => updateEditFormField('category_id', value)}
                        placeholder="Select Category"
                        required
                        error={editFormErrors.category_id}
                      >
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </ValidationSelect>

                      <div className="relative">
                        <ValidationSelect
                          label="Related Service (Optional)"
                          value={editFormData.service_id || ''}
                          onValueChange={(value) => updateEditFormField('service_id', value)}
                          placeholder={
                            !editFormData.category_id 
                              ? 'Select a category first' 
                              : filteredServices.length === 0 
                              ? 'No services available' 
                              : 'Select Service (Optional)'
                          }
                          error={editFormErrors.service_id}
                        >
                          {filteredServices.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - R{service.price}
                            </SelectItem>
                          ))}
                        </ValidationSelect>
                        {editFormData.category_id && filteredServices.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            No services found for the selected category
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Measurements & Quantity */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Measurements & Quantity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ValidationSelect
                      label="Unit of Measure"
                      value={editFormData.unit_of_measure}
                      onValueChange={(value) => updateEditFormField('unit_of_measure', value)}
                      error={editFormErrors.unit_of_measure}
                    >
                      {measurements.map((measurement) => (
                        <SelectItem key={measurement.id} value={measurement.value}>
                          {measurement.secondary_value || measurement.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationInput
                      label="Current Stock"
                      type="number"
                      min="0"
                      value={editFormData.current_stock.toString()}
                      onChange={(e) => updateEditFormField('current_stock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      error={editFormErrors.current_stock}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationInput
                      label="Unit Cost (ZAR)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.unit_cost.toString()}
                      onChange={(e) => updateEditFormField('unit_cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      error={editFormErrors.unit_cost}
                    />
                  </div>
                </div>

                {/* Description & Notes */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="space-y-4">
                    <ValidationTextarea
                      label="Description"
                      value={editFormData.description}
                      onChange={(e) => updateEditFormField('description', e.target.value)}
                      rows={3}
                      placeholder="Brief description of the item..."
                      error={editFormErrors.description}
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-item-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Service Inventory View Component
function ServiceInventoryView({
  user,
  showSuccess,
  showError,
  formatCurrency,
  userRoleData
}: {
  user: any
  showSuccess: (message: string) => void
  showError: (message: string) => void
  formatCurrency: (amount: number) => string
  userRoleData: any
}) {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [relationships, setRelationships] = useState<ServiceInventoryRelationship[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<ServiceInventoryRelationship | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState<string>('all')

  // Form state for adding new relationships
  const [formData, setFormData] = useState<ServiceInventoryRelationshipForm>({
    service_id: '',
    inventory_item_id: '',
    quantity_used: 1
  })

  // Form state for editing relationships
  const [editFormData, setEditFormData] = useState<ServiceInventoryRelationshipForm>({
    service_id: '',
    inventory_item_id: '',
    quantity_used: 1
  })

  // Form errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})

  // Clear error when field is updated
  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Clear error when edit field is updated
  const updateEditFormField = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Modal handlers
  const openAddModal = () => {
    setShowAddModal(true)
    setIsAddModalClosing(false)
  }

  const closeAddModal = () => {
    setIsAddModalClosing(true)
    setTimeout(() => {
      setShowAddModal(false)
      setIsAddModalClosing(false)
      setFormData({
        service_id: '',
        inventory_item_id: '',
        quantity_used: 1
      })
      setFormErrors({})
    }, 300)
  }

  // Edit modal handlers
  const openEditModal = (relationship: ServiceInventoryRelationship) => {
    setEditingRelationship(relationship)
    setEditFormData({
      service_id: relationship.service_id,
      inventory_item_id: relationship.inventory_item_id,
      quantity_used: relationship.quantity_used
    })
    setShowEditModal(true)
    setIsEditModalClosing(false)
  }

  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => {
      setShowEditModal(false)
      setIsEditModalClosing(false)
      setEditingRelationship(null)
      setEditFormErrors({})
    }, 300)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [servicesData, itemsData, relationshipsData] = await Promise.all([
        getServicesWithCategories(),
        InventoryService.getItems(),
        InventoryService.getServiceInventoryRelationships()
      ])
      setServices(servicesData)
      setInventoryItems(itemsData)
      setRelationships(relationshipsData)
    } catch (error) {
      console.error('Error loading service inventory data:', error)
      showError('Failed to load service inventory data')
    } finally {
      setLoading(false)
    }
  }

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.service_id) {
      errors.service_id = 'Service is required'
    }
    if (!formData.inventory_item_id) {
      errors.inventory_item_id = 'Inventory item is required'
    }
    if (!formData.quantity_used || formData.quantity_used <= 0) {
      errors.quantity_used = 'Quantity must be greater than 0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = () => {
    const errors: Record<string, string> = {}
    if (!editFormData.service_id) {
      errors.service_id = 'Service is required'
    }
    if (!editFormData.inventory_item_id) {
      errors.inventory_item_id = 'Inventory item is required'
    }
    if (!editFormData.quantity_used || editFormData.quantity_used <= 0) {
      errors.quantity_used = 'Quantity must be greater than 0'
    }

    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Add relationship function
  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please fix the errors in the form')
      return
    }

    try {
      setLoading(true)
      await InventoryService.createServiceInventoryRelationship(formData, user?.id || '')
      showSuccess('Service inventory relationship added successfully!')
      closeAddModal()
      setFormData({
        service_id: '',
        inventory_item_id: '',
        quantity_used: 1
      })
      setFormErrors({})
      await loadData()
    } catch (error) {
      console.error('Error adding relationship:', error)
      showError('Failed to add service inventory relationship')
    } finally {
      setLoading(false)
    }
  }

  // Update relationship function
  const handleUpdateRelationship = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingRelationship || !validateEditForm()) {
      showError('Please fix the errors in the form')
      return
    }

    try {
      setLoading(true)
      await InventoryService.updateServiceInventoryRelationship(editingRelationship.id, editFormData, user?.id || '')
      showSuccess('Service inventory relationship updated successfully!')
      closeEditModal()
      await loadData()
    } catch (error) {
      console.error('Error updating relationship:', error)
      showError('Failed to update service inventory relationship')
    } finally {
      setLoading(false)
    }
  }

  // Delete relationship function
  const handleDeleteRelationship = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service inventory relationship?')) {
      return
    }

    try {
      setLoading(true)
      await InventoryService.deleteServiceInventoryRelationship(id)
      showSuccess('Service inventory relationship deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Error deleting relationship:', error)
      showError('Failed to delete service inventory relationship')
    } finally {
      setLoading(false)
    }
  }

  // Filter relationships
  const filteredRelationships = relationships.filter(rel => {
    const matchesSearch = rel.service?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rel.inventory_item?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesService = !selectedService || selectedService === 'all' || rel.service_id === selectedService
    return matchesSearch && matchesService
  })

  if (loading && relationships.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Relationship
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ValidationInput
            label="Search Relationships"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by service or inventory item..."
          />
          <ValidationSelect
            label="Service"
            value={selectedService}
            onValueChange={(value) => setSelectedService(value)}
            placeholder="All Services"
          >
            <SelectItem value="all">All Services</SelectItem>
            {services.map(service => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </ValidationSelect>
        </div>
      </div>

      {/* Relationships List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Service Inventory Relationships</h3>
            <span className="text-sm text-gray-500">
              {filteredRelationships.length} relationship{filteredRelationships.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {filteredRelationships.length === 0 ? (
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
            {filteredRelationships.map((relationship) => (
              <div key={relationship.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  {/* Service and Item Info */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {relationship.service?.name}
                          </h4>
                          <p className="text-xs text-gray-500">Service</p>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {relationship.inventory_item?.name}
                          </h4>
                          <p className="text-xs text-gray-500">Inventory Item</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Quantity Used:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {relationship.quantity_used} {relationship.inventory_item?.unit_of_measure}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Category:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {relationship.inventory_item?.category?.name}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(relationship)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit relationship"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteRelationship(relationship.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Delete relationship"
                    >
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

      {/* Add Relationship Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div 
            className="absolute inset-0 pointer-events-auto" 
            onClick={closeAddModal}
          />
          
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isAddModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Service Inventory Relationship</h3>
              <button
                onClick={closeAddModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
              <form id="add-relationship-form" onSubmit={handleAddRelationship} className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <ValidationSelect
                    label="Service"
                    value={formData.service_id}
                    onValueChange={(value) => updateFormField('service_id', value)}
                    placeholder="Select Service"
                    required
                    error={formErrors.service_id}
                  >
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R{service.price}
                      </SelectItem>
                    ))}
                  </ValidationSelect>

                  <ValidationSelect
                    label="Inventory Item"
                    value={formData.inventory_item_id}
                    onValueChange={(value) => updateFormField('inventory_item_id', value)}
                    placeholder="Select Inventory Item"
                    required
                    error={formErrors.inventory_item_id}
                  >
                    {inventoryItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit_of_measure})
                      </SelectItem>
                    ))}
                  </ValidationSelect>

                  <ValidationInput
                    label="Quantity Used"
                    type="number"
                    min="1"
                    value={formData.quantity_used.toString()}
                    onChange={(e) => updateFormField('quantity_used', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    required
                    error={formErrors.quantity_used}
                  />
                </div>
              </form>
            </div>

            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeAddModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-relationship-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Relationship Modal */}
      {showEditModal && editingRelationship && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div 
            className="absolute inset-0 pointer-events-auto" 
            onClick={closeEditModal}
          />
          
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isEditModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Service Inventory Relationship</h3>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
              <form id="edit-relationship-form" onSubmit={handleUpdateRelationship} className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <ValidationSelect
                    label="Service"
                    value={editFormData.service_id}
                    onValueChange={(value) => updateEditFormField('service_id', value)}
                    placeholder="Select Service"
                    required
                    error={editFormErrors.service_id}
                  >
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R{service.price}
                      </SelectItem>
                    ))}
                  </ValidationSelect>

                  <ValidationSelect
                    label="Inventory Item"
                    value={editFormData.inventory_item_id}
                    onValueChange={(value) => updateEditFormField('inventory_item_id', value)}
                    placeholder="Select Inventory Item"
                    required
                    error={editFormErrors.inventory_item_id}
                  >
                    {inventoryItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit_of_measure})
                      </SelectItem>
                    ))}
                  </ValidationSelect>

                  <ValidationInput
                    label="Quantity Used"
                    type="number"
                    min="1"
                    value={editFormData.quantity_used.toString()}
                    onChange={(e) => updateEditFormField('quantity_used', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    required
                    error={editFormErrors.quantity_used}
                  />
                </div>
              </form>
            </div>

            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-relationship-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Financial Transactions View Component
function FinancialTransactionsView({
  user,
  showSuccess,
  showError
}: {
  user: any
  showSuccess: (message: string) => void
  showError: (message: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<Lookup[]>([])
  const [revenueTypes, setRevenueTypes] = useState<Lookup[]>([])
  const [transactionTypes, setTransactionTypes] = useState<Lookup[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Form state for adding new transactions
  const [formData, setFormData] = useState<FinancialTransactionForm>({
    transaction_type: 'income',
    category: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    receipt_number: ''
  })

  // Form state for editing transactions
  const [editFormData, setEditFormData] = useState<FinancialTransactionForm>({
    transaction_type: 'income',
    category: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    receipt_number: ''
  })

  // Form errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})

  // Clear error when field is updated
  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Clear error when edit field is updated
  const updateEditFormField = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Modal handlers
  const openAddModal = () => {
    setShowAddModal(true)
    setIsAddModalClosing(false)
  }

  const closeAddModal = () => {
    setIsAddModalClosing(true)
    setTimeout(() => {
      setShowAddModal(false)
      setIsAddModalClosing(false)
      setFormErrors({})
    }, 300)
  }

  // Edit modal handlers
  const openEditModal = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction)
    setEditFormData({
      transaction_type: transaction.transaction_type,
      category: transaction.category,
      amount: transaction.amount,
      transaction_date: transaction.transaction_date,
      payment_method: transaction.payment_method,
      receipt_number: transaction.receipt_number || ''
    })
    setShowEditModal(true)
    setIsEditModalClosing(false)
  }

  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => {
      setShowEditModal(false)
      setIsEditModalClosing(false)
      setEditingTransaction(null)
      setEditFormErrors({})
    }, 300)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [transactionsData, summaryData, paymentMethodsData, revenueTypesData, transactionTypesData] = await Promise.all([
        InventoryService.getFinancialTransactions(),
        InventoryService.getFinancialSummary(),
        lookupServiceCached.getPaymentMethods(),
        lookupServiceCached.getRevenueTypes(),
        lookupServiceCached.getTransactionTypes()
      ])
      setTransactions(transactionsData)
      setSummary(summaryData)
      setPaymentMethods(paymentMethodsData || [])
      setRevenueTypes(revenueTypesData || [])
      setTransactionTypes(transactionTypesData || [])
    } catch (error) {
      console.error('Error loading financial data:', error)
      showError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }


  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.category.trim()) {
      errors.category = 'Category is required'
    }
    if (formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }
    if (!formData.transaction_date) {
      errors.transaction_date = 'Transaction date is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = () => {
    const errors: Record<string, string> = {}
    if (!editFormData.category.trim()) {
      errors.category = 'Category is required'
    }
    if (editFormData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }
    if (!editFormData.transaction_date) {
      errors.transaction_date = 'Transaction date is required'
    }

    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please fix the errors in the form')
      return
    }

    try {
      setLoading(true)
      await InventoryService.createFinancialTransaction(formData, user?.id || '')
      showSuccess('Financial transaction added successfully!')
      closeAddModal()
      setFormData({
        transaction_type: 'income',
        category: '',
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        receipt_number: ''
      })
      setFormErrors({})
      await loadData()
    } catch (error) {
      console.error('Error adding transaction:', error)
      showError('Failed to add financial transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingTransaction || !validateEditForm()) {
      showError('Please fix the errors in the form')
      return
    }

    try {
      setLoading(true)
      await InventoryService.updateFinancialTransaction(editingTransaction.id, editFormData, user?.id || '')
      showSuccess('Financial transaction updated successfully!')
      closeEditModal()
      setEditFormErrors({})
      await loadData()
    } catch (error) {
      console.error('Error updating transaction:', error)
      showError('Failed to update financial transaction')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || transaction.transaction_type === filterType
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'type':
        comparison = a.transaction_type.localeCompare(b.transaction_type)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Transactions</h1>
          <p className="text-sm text-gray-600">Track money coming in and going out</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Transaction
        </button>
      </div>

      {/* Financial Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Income</p>
                <p className="text-lg sm:text-xl font-semibold text-green-600">
                  {formatCurrency(summary.total_income)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="text-lg sm:text-xl font-semibold text-red-600">
                  {formatCurrency(summary.total_expenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Net Profit</p>
                <p className={`text-lg sm:text-xl font-semibold ${
                  summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(summary.net_profit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ValidationInput
            label="Search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
          />

          <ValidationSelect
            label="Transaction Type"
            value={filterType}
            onValueChange={setFilterType}
          >
            <SelectItem value="all">All Types</SelectItem>
            {transactionTypes.map(type => (
              <SelectItem key={type.id} value={type.secondary_value || type.value}>
                {type.value}
              </SelectItem>
            ))}
          </ValidationSelect>

          <ValidationSelect
            label="Category"
            value={filterCategory}
            onValueChange={setFilterCategory}
          >
            <SelectItem value="all">All Categories</SelectItem>
            {revenueTypes.map(type => (
              <SelectItem key={type.id} value={type.secondary_value || type.value}>
                {type.value}
              </SelectItem>
            ))}
          </ValidationSelect>

          <ValidationSelect
            label="Sort By"
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field as 'date' | 'amount' | 'type')
              setSortOrder(order as 'asc' | 'desc')
            }}
          >
            <SelectItem value="date-desc">Date (Newest)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest)</SelectItem>
            <SelectItem value="amount-desc">Amount (Highest)</SelectItem>
            <SelectItem value="amount-asc">Amount (Lowest)</SelectItem>
            <SelectItem value="type-asc">Type (A-Z)</SelectItem>
            <SelectItem value="type-desc">Type (Z-A)</SelectItem>
          </ValidationSelect>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Transactions ({sortedTransactions.length})
          </h3>
        </div>

        {sortedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' || filterCategory !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first financial transaction'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => (
              <div key={transaction.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.transaction_type === 'income' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.category}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.transaction_date)}
                          {transaction.receipt_number && ` • ${transaction.receipt_number}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.payment_method}
                      </p>
                    </div>
                    <button
                      onClick={() => openEditModal(transaction)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100"
                      title="Edit transaction"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] pointer-events-auto">
          {/* Backdrop - invisible but blocks clicks */}
          <div 
            className="absolute inset-0" 
            onClick={closeAddModal}
          />
          
          {/* Modal Content */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isAddModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Financial Transaction</h3>
              <button
                onClick={closeAddModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="add-transaction-form" onSubmit={handleAddTransaction} className="space-y-4 sm:space-y-6">
                {/* Transaction Type */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Transaction Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationSelect
                      label="Transaction Type"
                      value={formData.transaction_type}
                      onValueChange={(value) => updateFormField('transaction_type', value)}
                      required
                      error={formErrors.transaction_type}
                      placeholder="Select transaction type"
                    >
                      {transactionTypes.map(type => (
                        <SelectItem key={type.id} value={type.secondary_value || type.value}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationSelect
                      label="Category"
                      value={formData.category}
                      onValueChange={(value) => updateFormField('category', value)}
                      required
                      error={formErrors.category}
                      placeholder="Select category"
                    >
                      {revenueTypes.map(type => (
                        <SelectItem key={type.id} value={type.secondary_value || type.value}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>
                  </div>
                </div>

                {/* Amount and Date */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationInput
                      label="Amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => updateFormField('amount', parseFloat(e.target.value) || 0)}
                      required
                      error={formErrors.amount}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Transaction Date <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        date={formData.transaction_date ? new Date(formData.transaction_date) : undefined}
                        onDateChange={(date) => updateFormField('transaction_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="Select transaction date"
                        allowSameDay={true}
                        className="w-full"
                      />
                      {formErrors.transaction_date && (
                        <p className="text-sm text-red-600">{formErrors.transaction_date}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method and Receipt */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationSelect
                      label="Payment Method"
                      value={formData.payment_method || ''}
                      onValueChange={(value) => updateFormField('payment_method', value)}
                      placeholder="Select payment method"
                    >
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.value}>
                          {method.secondary_value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationInput
                      label="Receipt Number (Optional)"
                      type="text"
                      value={formData.receipt_number}
                      onChange={(e) => updateFormField('receipt_number', e.target.value)}
                      placeholder="e.g., RCP-001"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeAddModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-transaction-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 z-[60] pointer-events-auto">
          {/* Backdrop - invisible but blocks clicks */}
          <div 
            className="absolute inset-0" 
            onClick={closeEditModal}
          />
          
          {/* Modal Content */}
          <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto overflow-visible ${
              isEditModalClosing
                ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
                : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%] modal-enter lg:modal-enter-desktop'
            }`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Handle bar (Mobile only) */}
            <div className="flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Financial Transaction</h3>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="edit-transaction-form" onSubmit={handleUpdateTransaction} className="space-y-4 sm:space-y-6">
                {/* Transaction Type */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-3">Transaction Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationSelect
                      label="Transaction Type"
                      value={editFormData.transaction_type}
                      onValueChange={(value) => updateEditFormField('transaction_type', value)}
                      required
                      error={editFormErrors.transaction_type}
                      placeholder="Select transaction type"
                    >
                      {transactionTypes.map(type => (
                        <SelectItem key={type.id} value={type.secondary_value || type.value}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationSelect
                      label="Category"
                      value={editFormData.category}
                      onValueChange={(value) => updateEditFormField('category', value)}
                      required
                      error={editFormErrors.category}
                      placeholder="Select category"
                    >
                      {revenueTypes.map(type => (
                        <SelectItem key={type.id} value={type.secondary_value || type.value}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>
                  </div>
                </div>

                {/* Amount and Date */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationInput
                      label="Amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.amount}
                      onChange={(e) => updateEditFormField('amount', parseFloat(e.target.value) || 0)}
                      required
                      error={editFormErrors.amount}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Transaction Date <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        date={editFormData.transaction_date ? new Date(editFormData.transaction_date) : undefined}
                        onDateChange={(date) => updateEditFormField('transaction_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="Select transaction date"
                        allowSameDay={true}
                        className="w-full"
                      />
                      {editFormErrors.transaction_date && (
                        <p className="text-sm text-red-600">{editFormErrors.transaction_date}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method and Receipt */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ValidationSelect
                      label="Payment Method"
                      value={editFormData.payment_method || ''}
                      onValueChange={(value) => updateEditFormField('payment_method', value)}
                      placeholder="Select payment method"
                    >
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.value}>
                          {method.secondary_value}
                        </SelectItem>
                      ))}
                    </ValidationSelect>

                    <ValidationInput
                      label="Receipt Number (Optional)"
                      type="text"
                      value={editFormData.receipt_number}
                      onChange={(e) => updateEditFormField('receipt_number', e.target.value)}
                      placeholder="Enter receipt number"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-b-xl lg:rounded-b-xl">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-transaction-form"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
