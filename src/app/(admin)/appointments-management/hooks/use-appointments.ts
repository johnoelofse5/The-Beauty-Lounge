import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { AppointmentExtended, ViewMode } from '@/types'
import { getFilteredAppointments } from '@/lib/rbac'
import { formatDateForAPI, getDateRange } from '../utils/appointment-formatters'

export function useAppointments(currentDate: Date, viewMode: ViewMode) {
  const { user, loading: authLoading, userRoleData } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)

      if (!user || !userRoleData) {
        setAppointments([])
        return
      }

      const { startDate, endDate } = getDateRange(currentDate, viewMode)
      const appointmentsData = await getFilteredAppointments(user.id, userRoleData.role)

      const filtered = appointmentsData.filter(apt => {
        const dateOnly = apt.appointment_date.split('T')[0]
        return dateOnly >= startDate && dateOnly <= endDate
      })

      const withServices = await Promise.all(
        filtered.map(async (apt) => {
          const serviceIds = apt.service_ids || (apt.service_id ? [apt.service_id] : [])
          if (serviceIds.length === 0) return { ...apt, services: [] }

          const { data } = await supabase
            .from('services')
            .select(`
              *,
              category:service_categories (
                id, name, description, display_order, icon, color
              )
            `)
            .in('id', serviceIds)
            .eq('is_active', true)
            .eq('is_deleted', false)

          return { ...apt, services: data || [] }
        })
      )

      setAppointments(withServices)
    } catch (err) {
      setError('Failed to load appointments')
      console.error('Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [user, userRoleData, currentDate, viewMode])

  useEffect(() => {
    if (user && userRoleData) {
      loadAppointments()
    }
  }, [user, userRoleData, loadAppointments])

  const getAppointmentsForDate = useCallback((date: string) => {
    return appointments.filter(apt => {
      if (apt.appointment_date.includes('T')) {
        return formatDateForAPI(new Date(apt.appointment_date)) === date
      }
      return apt.appointment_date === date
    })
  }, [appointments])

  const getAppointmentsForTimeSlot = useCallback((date: string, hour: number) => {
    return appointments.filter(apt => {
      if (apt.appointment_date.includes('T')) {
        if (formatDateForAPI(new Date(apt.appointment_date)) !== date) return false
        return new Date(apt.start_time).getHours() === hour
      }
      if (apt.appointment_date !== date) return false
      return parseInt(apt.start_time.split(':')[0]) === hour
    })
  }, [appointments])

  return {
    appointments,
    loading,
    authLoading,
    error,
    user,
    userRoleData,
    loadAppointments,
    getAppointmentsForDate,
    getAppointmentsForTimeSlot
  }
}

export function useModalState() {
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentExtended | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [isAppointmentModalClosing, setIsAppointmentModalClosing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreateModalClosing, setIsCreateModalClosing] = useState(false)
  const [selectedCreateDate, setSelectedCreateDate] = useState<Date | null>(null)

  const handleAppointmentClick = (appointment: AppointmentExtended) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }

  const closeAppointmentModal = () => {
    setIsAppointmentModalClosing(true)
    setTimeout(() => {
      setShowAppointmentModal(false)
      setSelectedAppointment(null)
      setIsAppointmentModalClosing(false)
    }, 300)
  }

  const openEditModal = () => {
    setShowAppointmentModal(false)
    setShowCreateModal(false)
    setSelectedCreateDate(null)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => {
      setShowEditModal(false)
      setIsEditModalClosing(false)
    }, 300)
  }

  const openCreateModal = (date: Date) => {
    setShowAppointmentModal(false)
    setShowEditModal(false)
    setSelectedAppointment(null)
    setSelectedCreateDate(date)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setIsCreateModalClosing(true)
    setTimeout(() => {
      setShowCreateModal(false)
      setSelectedCreateDate(null)
      setIsCreateModalClosing(false)
    }, 300)
  }

  return {
    selectedAppointment,
    showAppointmentModal,
    isAppointmentModalClosing,
    showEditModal,
    isEditModalClosing,
    showCreateModal,
    isCreateModalClosing,
    selectedCreateDate,
    handleAppointmentClick,
    closeAppointmentModal,
    openEditModal,
    closeEditModal,
    openCreateModal,
    closeCreateModal
  }
}

export function useInvoiceActions(
  appointments: AppointmentExtended[],
  userId: string | undefined,
  showSuccess: (msg: string) => void,
  showError: (msg: string) => void
) {
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState<Set<string>>(new Set())
  const [processingDownloadIds, setProcessingDownloadIds] = useState<Set<string>>(new Set())

  const handleSendInvoice = async (appointmentId: string) => {
    try {
      setProcessingInvoiceIds(prev => new Set(prev).add(appointmentId))
      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (!appointment) { showError('Appointment not found'); return }
      if (!appointment.client?.email && !appointment.client_email) {
        showError('Client email not available for this appointment'); return
      }
      if (!userId) { showError('User not authenticated'); return }

      const { sendInvoiceEmail } = await import('@/lib/email-service')
      const result = await sendInvoiceEmail(
        appointmentId, userId,
        appointment.client?.email || appointment.client_email || ''
      )
      result.success
        ? showSuccess('Invoice sent successfully via email!')
        : showError(`Failed to send invoice: ${result.message}`)
    } catch {
      showError('Failed to send invoice')
    } finally {
      setProcessingInvoiceIds(prev => { const s = new Set(prev); s.delete(appointmentId); return s })
    }
  }

  const handleDownloadPDF = async (appointmentId: string) => {
    try {
      setProcessingDownloadIds(prev => new Set(prev).add(appointmentId))
      if (!userId) { showError('User not authenticated'); return }

      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke(
        'generate-invoice-pdf',
        { body: { appointment_id: appointmentId, current_user_id: userId } }
      )
      if (invoiceError || !invoiceData?.success) {
        showError(invoiceData?.message || 'Failed to generate invoice PDF'); return
      }

      const invoice = invoiceData.data
      const pdfResponse = await fetch(invoice.pdf_url)
      if (!pdfResponse.ok) throw new Error('Failed to fetch PDF file')

      const pdfBlob = await pdfResponse.blob()
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice_${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showSuccess('PDF downloaded successfully!')
    } catch (err) {
      console.error('Error downloading PDF:', err)
      showError('Failed to download PDF')
    } finally {
      setProcessingDownloadIds(prev => { const s = new Set(prev); s.delete(appointmentId); return s })
    }
  }

  return { processingInvoiceIds, processingDownloadIds, handleSendInvoice, handleDownloadPDF }
}