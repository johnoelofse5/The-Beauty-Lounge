import { useState, useEffect } from 'react'
import { InventoryService } from '@/lib/inventory-service'
import { lookupServiceCached } from '@/lib/lookup-service-cached'
import { supabase } from '@/lib/supabase'
import { FinancialTransaction, FinancialTransactionForm, FinancialSummary } from '@/types/inventory'
import { Lookup } from '@/types/lookup'

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM: FinancialTransactionForm = {
  transaction_type: 'income',
  category: '',
  amount: 0,
  transaction_date: TODAY,
  payment_method: '',
  receipt_number: ''
}

export function useFinancialTransactions(
  userId: string,
  showError: (msg: string) => void,
  showSuccess: (msg: string) => void
) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<Lookup[]>([])
  const [revenueTypes, setRevenueTypes] = useState<Lookup[]>([])
  const [transactionTypes, setTransactionTypes] = useState<Lookup[]>([])

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddModalClosing, setIsAddModalClosing] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)

  // Form state
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Filter/sort state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Report selection state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()))
  const [selectedYearlyYear, setSelectedYearlyYear] = useState(String(currentDate.getFullYear()))

  const loadData = async () => {
    try {
      setLoading(true)
      const [txns, sum, pmethods, rtypes, ttypes] = await Promise.all([
        InventoryService.getFinancialTransactions(),
        InventoryService.getFinancialSummary(),
        lookupServiceCached.getPaymentMethods(),
        lookupServiceCached.getRevenueTypes(),
        lookupServiceCached.getTransactionTypes()
      ])
      setTransactions(txns)
      setSummary(sum)
      setPaymentMethods(pmethods || [])
      setRevenueTypes(rtypes || [])
      setTransactionTypes(ttypes || [])
    } catch (err) {
      console.error(err)
      showError('Failed to load financial data')
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

  const openEditModal = (tx: FinancialTransaction) => {
    setEditingTransaction(tx)
    setEditForm({
      transaction_type: tx.transaction_type,
      category: tx.category,
      amount: tx.amount,
      transaction_date: tx.transaction_date,
      payment_method: tx.payment_method,
      receipt_number: tx.receipt_number || ''
    })
    setEditErrors({})
    setShowEditModal(true)
  }
  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => { setShowEditModal(false); setIsEditModalClosing(false); setEditingTransaction(null); setEditErrors({}) }, 300)
  }

  const updateAddField = (field: string, value: any) => {
    setAddForm(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) setAddErrors(prev => ({ ...prev, [field]: '' }))
  }
  const updateEditField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (form: FinancialTransactionForm, setErrors: (e: Record<string, string>) => void) => {
    const errors: Record<string, string> = {}
    if (!form.category.trim()) errors.category = 'Category is required'
    if (form.amount <= 0) errors.amount = 'Amount must be greater than 0'
    if (!form.transaction_date) errors.transaction_date = 'Transaction date is required'
    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(addForm, setAddErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.createFinancialTransaction(addForm, userId)
      showSuccess('Financial transaction added successfully!')
      closeAddModal()
      await loadData()
    } catch (err) { console.error(err); showError('Failed to add financial transaction') }
    finally { setLoading(false) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransaction || !validate(editForm, setEditErrors)) { showError('Please fix the errors in the form'); return }
    try {
      setLoading(true)
      await InventoryService.updateFinancialTransaction(editingTransaction.id, editForm)
      showSuccess('Financial transaction updated successfully!')
      closeEditModal()
      await loadData()
    } catch (err) { console.error(err); showError('Failed to update financial transaction') }
    finally { setLoading(false) }
  }

  // Report helpers
  const downloadPDF = async (url: string, filename: string) => {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = window.URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a); a.click()
    window.URL.revokeObjectURL(a.href)
    document.body.removeChild(a)
  }

  const handleMonthlyReport = async () => {
    try {
      setLoading(true)
      const yr = parseInt(selectedYear)
      const mo = parseInt(selectedMonth) - 1
      const dateFrom = new Date(yr, mo, 1).toISOString().split('T')[0]
      const isNow = yr === currentDate.getFullYear() && mo === currentDate.getMonth()
      const dateTo = isNow ? currentDate.toISOString().split('T')[0] : new Date(yr, mo + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase.functions.invoke('generate-financial-transaction-pdf', {
        body: { report_type: 'monthly', date_from: dateFrom, date_to: dateTo }
      })
      if (error || !data?.success) { showError(data?.message || 'Failed to generate monthly report'); return }
      await downloadPDF(data.data.pdf_url, `monthly-financial-report-${yr}-${String(mo + 1).padStart(2, '0')}.pdf`)
      showSuccess('Monthly financial report generated successfully!')
    } catch (err) { console.error(err); showError('Failed to generate monthly financial report') }
    finally { setLoading(false) }
  }

  const handleYearlyReport = async () => {
    try {
      setLoading(true)
      const yr = parseInt(selectedYearlyYear)
      const dateFrom = new Date(yr, 0, 1).toISOString().split('T')[0]
      const isNow = yr === currentDate.getFullYear()
      const dateTo = isNow ? currentDate.toISOString().split('T')[0] : new Date(yr, 11, 31).toISOString().split('T')[0]

      const { data, error } = await supabase.functions.invoke('generate-financial-transaction-pdf', {
        body: { report_type: 'yearly', date_from: dateFrom, date_to: dateTo }
      })
      if (error || !data?.success) { showError(data?.message || 'Failed to generate yearly report'); return }
      await downloadPDF(data.data.pdf_url, `yearly-financial-report-${yr}.pdf`)
      showSuccess('Yearly financial report generated successfully!')
    } catch (err) { console.error(err); showError('Failed to generate yearly financial report') }
    finally { setLoading(false) }
  }

  // Derived: filtered + sorted transactions
  const filteredTransactions = transactions
    .filter(tx => {
      const matchSearch = tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = filterType === 'all' || tx.transaction_type === filterType
      const matchCat = filterCategory === 'all' || tx.category === filterCategory
      return matchSearch && matchType && matchCat
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') cmp = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      else if (sortBy === 'amount') cmp = a.amount - b.amount
      else cmp = a.transaction_type.localeCompare(b.transaction_type)
      return sortOrder === 'asc' ? cmp : -cmp
    })

  return {
    loading, summary, paymentMethods, revenueTypes, transactionTypes,
    transactions: filteredTransactions,
    showAddModal, isAddModalClosing, editingTransaction, showEditModal, isEditModalClosing,
    addForm, editForm, addErrors, editErrors,
    searchTerm, setSearchTerm, filterType, setFilterType, filterCategory, setFilterCategory,
    sortBy, setSortBy, sortOrder, setSortOrder,
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    selectedYearlyYear, setSelectedYearlyYear, currentDate,
    openAddModal, closeAddModal, openEditModal, closeEditModal,
    updateAddField, updateEditField,
    handleAdd, handleUpdate, handleMonthlyReport, handleYearlyReport
  }
}