'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { ServiceWithCategory, AppointmentExtended, ViewMode } from '@/types'
import { formatDuration, getServicesWithCategories } from '@/lib/services'
import { getFilteredAppointments, isPractitioner, canViewOwnAppointmentsOnly } from '@/lib/rbac'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import { DatePicker } from '@/components/date-picker'
import TimeSlotSelector from '@/components/TimeSlotSelector'
import { AppointmentSMSService } from '@/lib/appointment-sms-service'
import { AppointmentCalendarService } from '@/lib/appointment-calendar-service'
import { sendInvoiceEmail } from '@/lib/email-service'
import { Practitioner } from '@/types/practitioner'
import { Client } from '@/types/client'

export default function AppointmentsPage() {
  const { user, loading: authLoading, userRoleData } = useAuth()
  const { showSuccess, showError } = useToast()
  const [appointments, setAppointments] = useState<AppointmentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentExtended | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [isAppointmentModalClosing, setIsAppointmentModalClosing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditModalClosing, setIsEditModalClosing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreateModalClosing, setIsCreateModalClosing] = useState(false)
  const [selectedCreateDate, setSelectedCreateDate] = useState<Date | null>(null)
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState<Set<string>>(new Set())
  const [processingDownloadIds, setProcessingDownloadIds] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!user || !userRoleData) {
        setAppointments([])
        return
      }

      const { startDate, endDate } = getDateRange(currentDate, viewMode)
      
      const appointmentsData = await getFilteredAppointments(user.id, userRoleData.role)
      
      const filteredAppointments = appointmentsData.filter(apt => {
        const aptDate = apt.appointment_date
        const aptDateOnly = aptDate.split('T')[0]
        return aptDateOnly >= startDate && aptDateOnly <= endDate
      })

      
      const appointmentsWithServices = await Promise.all(
        filteredAppointments.map(async (apt) => {
          const serviceIds = apt.service_ids || (apt.service_id ? [apt.service_id] : [])
          if (serviceIds.length === 0) return { ...apt, services: [] }

          const { data: servicesData } = await supabase
            .from('services')
            .select(`
              *,
              category:service_categories (
                id,
                name,
                description,
                display_order,
                icon,
                color
              )
            `)
            .in('id', serviceIds)
            .eq('is_active', true)
            .eq('is_deleted', false)

          return {
            ...apt,
            services: servicesData || []
          }
        })
      )

      setAppointments(appointmentsWithServices)
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

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDateRange = (date: Date, mode: ViewMode) => {
    const startDate = new Date(date)
    const endDate = new Date(date)

    switch (mode) {
      case 'day':
        break
      case 'week':
        const dayOfWeek = startDate.getDay()
        startDate.setDate(startDate.getDate() - dayOfWeek)
        endDate.setDate(endDate.getDate() + (6 - dayOfWeek))
        break
      case 'month':
        startDate.setDate(1)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
        break
    }

    return {
      startDate: formatDateForAPI(startDate),
      endDate: formatDateForAPI(endDate)
    }
  }

  const formatTime = (time: string): string => {
    if (time.includes('T') || time.includes('Z')) {
      const date = new Date(time)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatDate = (date: string): string => {
    if (date.includes('T') || date.includes('Z')) {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
    
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    return localDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number): string => {
    return `R${price.toFixed(2)}`
  }

  const getTotalPrice = (services: ServiceWithCategory[]): number => {
    return services.reduce((total, service) => total + (service.price || 0), 0)
  }

  
  const getDisplayUserInfo = (appointment: AppointmentExtended) => {
    
    if (!userRoleData?.role) return appointment.client

    
    if (canViewOwnAppointmentsOnly(userRoleData.role)) {
      return appointment.practitioner
    }
    
    else if (isPractitioner(userRoleData.role)) {
      if (appointment.is_external_client) {
        return {
          first_name: appointment.client_first_name || 'Unknown',
          last_name: appointment.client_last_name || 'User',
          email: appointment.client_email || 'No email',
          phone: appointment.client_phone || 'No phone'
        }
      }
      return appointment.client
    }
    
    else {
      if (appointment.is_external_client) {
        return {
          first_name: appointment.client_first_name || 'Unknown',
          last_name: appointment.client_last_name || 'User',
          email: appointment.client_email || 'No email',
          phone: appointment.client_phone || 'No phone'
        }
      }
      return appointment.client
    }
  }

  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.getAttribute('data-animate-id')
          if (elementId) {
            setVisibleElements(prev => {
              const newSet = new Set(prev)
              if (entry.isIntersecting) {
                newSet.add(elementId)
              } else {
                newSet.delete(elementId)
              }
              return newSet
            })
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  
  useEffect(() => {
    if (observerRef.current && !loading) {
      const elementsToObserve = document.querySelectorAll('[data-animate-id]')
      elementsToObserve.forEach(element => {
        observerRef.current?.observe(element)
      })
    }
  }, [loading, viewMode, appointments])

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

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

  const handleSendInvoice = async (appointmentId: string) => {
    try {
      setProcessingInvoiceIds(prev => new Set(prev).add(appointmentId))

      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (!appointment) {
        showError('Appointment not found')
        return
      }

      if (!appointment.client?.email && !appointment.client_email) {
        showError('Client email not available for this appointment')
        return
      }

      const currentUserId = user?.id
      if (!currentUserId) {
        showError('User not authenticated')
        return
      }

      const result = await sendInvoiceEmail(
        appointmentId,
        currentUserId,
        appointment.client?.email || appointment.client_email || ''
      )

      if (result.success) {
        showSuccess('Invoice sent successfully via email!')
      } else {
        showError(`Failed to send invoice: ${result.message}`)
      }
    } catch (error) {
      showError('Failed to send invoice')
    } finally {
      setProcessingInvoiceIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleDownloadPDF = async (appointmentId: string) => {
    try {
      setProcessingDownloadIds(prev => new Set(prev).add(appointmentId))

      const currentUserId = user?.id
      if (!currentUserId) {
        showError('User not authenticated')
        return
      }

      const generatePayload = {
        appointment_id: appointmentId,
        current_user_id: currentUserId,
      };

      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke(
        'generate-invoice-pdf',
        { body: generatePayload }
      );

      if (invoiceError || !invoiceData?.success) {
        showError(invoiceData?.message || 'Failed to generate invoice PDF')
        return
      }

      const invoice = invoiceData.data;

      const pdfResponse = await fetch(invoice.pdf_url);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF file');
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('PDF downloaded successfully!')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showError('Failed to download PDF')
    } finally {
      setProcessingDownloadIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter(apt => {
      
      if (apt.appointment_date && apt.appointment_date.includes('T')) {
        const aptDate = new Date(apt.appointment_date)
        const aptDateString = formatDateForAPI(aptDate)
        return aptDateString === date
      }
      
      return apt.appointment_date === date
    })
  }

  const getAppointmentsForTimeSlot = (date: string, hour: number) => {
    return appointments.filter(apt => {
      
      if (apt.appointment_date && apt.appointment_date.includes('T')) {
        const aptDate = new Date(apt.appointment_date)
        const aptDateString = formatDateForAPI(aptDate)
        if (aptDateString !== date) return false
        const aptStartTime = new Date(apt.start_time)
        const startHour = aptStartTime.getHours()
        return startHour === hour
      }
      
      if (apt.appointment_date !== date) return false
      const startHour = parseInt(apt.start_time.split(':')[0])
      return startHour === hour
    })
  }

  const renderDayView = () => {
    const dateStr = formatDateForDB(currentDate)
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
            const hourAppointments = getAppointmentsForTimeSlot(dateStr, hour)
            
            return (
              <div key={hour} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatTime(`${hour.toString().padStart(2, '0')}:00:00`)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {hourAppointments.length} appointment{hourAppointments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {hourAppointments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No appointments</p>
                ) : (
                  <div className="space-y-2">
                    {hourAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={() => handleAppointmentClick(appointment)}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {getDisplayUserInfo(appointment)?.first_name || 'Unknown'} {getDisplayUserInfo(appointment)?.last_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {appointment.services?.map(s => s.name).join(', ') || 'Service'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-600">
                              {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatPrice(getTotalPrice(appointment.services || []))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h2>
        </div>
        
        {/* Vertical layout for all screen sizes */}
        <div className="space-y-4">
          {weekDays.map((day, dayIndex) => {
            const dateStr = formatDateForDB(day)
            const dayAppointments = getAppointmentsForDate(dateStr)
            const isToday = day.toDateString() === new Date().toDateString()
            
            return (
              <div 
                key={dayIndex} 
                className={`bg-white rounded-lg border p-4 ${
                  isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
                data-animate-id={`week-day-${dayIndex}`}
                style={{
                  opacity: visibleElements.has(`week-day-${dayIndex}`) ? 1 : 0,
                  transform: visibleElements.has(`week-day-${dayIndex}`) ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s ease-out ${dayIndex * 0.1}s`
                }}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="text-sm font-semibold">{day.getDate()}</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                        {day.toLocaleDateString('en-US', { weekday: 'long' })}
                      </h3>
                      <p className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                        {day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {/* Appointments List */}
                <div className="space-y-3">
                  {dayAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">No appointments scheduled</p>
                    </div>
                  ) : (
                    dayAppointments.map((appointment, appointmentIndex) => (
                      <div
                        key={appointment.id}
                        onClick={() => handleAppointmentClick(appointment)}
                        data-animate-id={`week-appointment-${appointment.id}`}
                        style={{
                          opacity: visibleElements.has(`week-appointment-${appointment.id}`) ? 1 : 0,
                          transform: visibleElements.has(`week-appointment-${appointment.id}`) ? 'translateY(0)' : 'translateY(20px)',
                          transition: `all 0.5s ease-out ${(dayIndex * 0.1) + (appointmentIndex * 0.05)}s`
                        }}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <h4 className="font-medium text-gray-900">
                              {getDisplayUserInfo(appointment)?.first_name || 'Unknown'} {getDisplayUserInfo(appointment)?.last_name || 'User'}
                            </h4>
                          </div>
                          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>Duration: {formatDuration(30)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                          {appointment.services && appointment.services.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {appointment.services.length} service{appointment.services.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDay = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    
    const currentMonthDays = days.filter(day => day.getMonth() === month)
    const monthAppointments = currentMonthDays.map(day => {
      const dateStr = formatDateForDB(day)
      const dayAppointments = getAppointmentsForDate(dateStr)
      return {
        date: day,
        dateStr,
        appointments: dayAppointments
      }
    }).filter(day => day.appointments.length > 0)
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        
        {/* Desktop: Calendar Grid */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Body */}
            <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dateStr = formatDateForDB(day)
              const dayAppointments = getAppointmentsForDate(dateStr)
                const isCurrentMonth = day.getMonth() === month
                const isToday = day.toDateString() === new Date().toDateString()
                
                return (
                  <div
                    key={index}
                    onClick={() => isCurrentMonth && openCreateModal(day)}
                    className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                      isCurrentMonth ? 'bg-white cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
                    } ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600' : ''}`}>
                        {day.getDate()}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map(appointment => (
                        <div
                          key={appointment.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAppointmentClick(appointment)
                          }}
                          className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
                        >
                          {formatTime(appointment.start_time)} {getDisplayUserInfo(appointment)?.first_name || 'Unknown'}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: List View */}
        <div className="lg:hidden">
          {monthAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments this month</h3>
              <p className="text-gray-500">All appointments for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthAppointments.map(({ date, appointments }) => {
                const isToday = date.toDateString() === new Date().toDateString()
                
                return (
                  <div 
                    key={date.toISOString()} 
                    onClick={() => openCreateModal(date)}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        {isToday && (
                          <span className="text-sm text-blue-600 font-medium">Today</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {appointments.map((appointment, index) => (
                        <div
                          key={appointment.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAppointmentClick(appointment)
                          }}
                          data-animate-id={`appointment-${appointment.id}`}
                          style={{
                            opacity: visibleElements.has(`appointment-${appointment.id}`) ? 1 : 0,
                            transform: visibleElements.has(`appointment-${appointment.id}`) ? 'translateY(0)' : 'translateY(30px)',
                            transition: `all 0.6s ease-out ${index * 0.1}s`
                          }}
                          className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {getDisplayUserInfo(appointment)?.first_name || 'Unknown'} {getDisplayUserInfo(appointment)?.last_name || 'User'}
                            </h4>
                            <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded border">
                              {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Duration: {formatDuration(30)}</span>
                            <span>Status: {appointment.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You must be logged in to view appointments.</p>
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
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* View Controls */}
        <div 
          className="mb-8 transition-all duration-700 ease-out"
          data-animate-id="view-controls"
          style={{
            opacity: visibleElements.has('view-controls') ? 1 : 0,
            transform: visibleElements.has('view-controls') ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          {/* Mobile Layout - Stacked */}
          <div className="flex flex-col space-y-4 md:hidden">
            {/* View Mode Toggle */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden md:flex items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* View Content */}
        <div
          data-animate-id="appointments-content"
          style={{
            opacity: visibleElements.has('appointments-content') ? 1 : 0,
            transform: visibleElements.has('appointments-content') ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.7s ease-out'
          }}
        >
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>

        {/* Appointment Detail Modal - Bottom Sheet */}
        {showAppointmentModal && selectedAppointment && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop - invisible but clickable */}
            <div 
              className="fixed inset-0 pointer-events-auto"
              onClick={closeAppointmentModal}
            />
            
            {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
            <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto ${
              isAppointmentModalClosing 
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
                  Appointment Details
                </h3>
                <button
                  onClick={closeAppointmentModal}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {/* Show relevant information first based on user role */}
                  {(() => {
                    return userRoleData?.role && canViewOwnAppointmentsOnly(userRoleData.role)
                  })() ? (
                    
                    <>
                      {/* Practitioner Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Practitioner</h4>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Name</p>
                              <p className="text-gray-900">
                                {selectedAppointment.practitioner?.first_name || 'Unknown'} {selectedAppointment.practitioner?.last_name || 'User'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Email</p>
                              <p className="text-gray-900">{selectedAppointment.practitioner?.email || 'No email'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Phone</p>
                              <p className="text-gray-900">{selectedAppointment.practitioner?.phone || 'No phone'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Status</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedAppointment.status === 'scheduled' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : selectedAppointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedAppointment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Client Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Information</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Name</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client ? (
                                  <>
                                    {selectedAppointment.client_first_name || 'Unknown'} {selectedAppointment.client_last_name || 'User'}
                                    <span className="text-xs text-gray-500 ml-2">(External Client)</span>
                                  </>
                                ) : (
                                  <>
                                    {selectedAppointment.client?.first_name || 'Unknown'} {selectedAppointment.client?.last_name || 'User'}
                                  </>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Email</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client 
                                  ? (selectedAppointment.client_email || 'No email')
                                  : (selectedAppointment.client?.email || 'No email')
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Phone</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client 
                                  ? (selectedAppointment.client_phone || 'No phone')
                                  : (selectedAppointment.client?.phone || 'No phone')
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    
                    <>
                      {/* Client Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h4>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Name</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client ? (
                                  <>
                                    {selectedAppointment.client_first_name || 'Unknown'} {selectedAppointment.client_last_name || 'User'}
                                    <span className="text-xs text-gray-500 ml-2">(External Client)</span>
                                  </>
                                ) : (
                                  <>
                                    {selectedAppointment.client?.first_name || 'Unknown'} {selectedAppointment.client?.last_name || 'User'}
                                  </>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Email</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client 
                                  ? (selectedAppointment.client_email || 'No email')
                                  : (selectedAppointment.client?.email || 'No email')
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Phone</p>
                              <p className="text-gray-900">
                                {selectedAppointment.is_external_client 
                                  ? (selectedAppointment.client_phone || 'No phone')
                                  : (selectedAppointment.client?.phone || 'No phone')
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Status</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedAppointment.status === 'scheduled' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : selectedAppointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedAppointment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Practitioner Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Practitioner Information</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Name</p>
                              <p className="text-gray-900">
                                {selectedAppointment.practitioner?.first_name || 'Unknown'} {selectedAppointment.practitioner?.last_name || 'User'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Email</p>
                              <p className="text-gray-900">{selectedAppointment.practitioner?.email || 'No email'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Phone</p>
                              <p className="text-gray-900">{selectedAppointment.practitioner?.phone || 'No phone'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Services */}
                  {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Services</h4>
                      <div className="space-y-3">
                        {selectedAppointment.services.map(service => (
                          <div key={service.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{service.name}</h5>
                                {service.description && (
                                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm text-gray-500">
                                    Duration: {formatDuration(service.duration_minutes)}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Price: {formatPrice(service.price || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date & Time */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Date & Time</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Date</p>
                          <p className="text-gray-900">{formatDate(selectedAppointment.appointment_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Time</p>
                          <p className="text-gray-900">
                            {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedAppointment.notes && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="space-y-3">
                  {/* Invoice button for completed appointments */}
                  {userRoleData?.role && selectedAppointment.status === 'completed' && (
                    isPractitioner(userRoleData.role) ||
                    (userRoleData.role?.name === 'super_admin')
                  ) && (
                    <button
                      onClick={() => handleSendInvoice(selectedAppointment.id)}
                      disabled={processingInvoiceIds.has(selectedAppointment.id)}
                      className="w-full bg-green-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {processingInvoiceIds.has(selectedAppointment.id) ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Sending Invoice...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Send Invoice via Email</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Download PDF button for completed appointments */}
                  {userRoleData?.role && selectedAppointment.status === 'completed' && (
                    isPractitioner(userRoleData.role) ||
                    (userRoleData.role?.name === 'super_admin')
                  ) && (
                    <button
                      onClick={() => handleDownloadPDF(selectedAppointment.id)}
                      disabled={processingDownloadIds.has(selectedAppointment.id)}
                      className="w-full bg-blue-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {processingDownloadIds.has(selectedAppointment.id) ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <div className="flex space-x-3">
                    {/* Show edit button for clients viewing their own appointments or practitioners viewing appointments assigned to them */}
                    {userRoleData?.role && selectedAppointment.status === 'scheduled' && (
                      (canViewOwnAppointmentsOnly(userRoleData.role) && selectedAppointment.user_id === userRoleData.user?.id) ||
                      (isPractitioner(userRoleData.role) && selectedAppointment.practitioner_id === userRoleData.user?.id)
                    ) && (
                      <button
                        onClick={openEditModal}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base"
                      >
                        Edit Appointment
                      </button>
                    )}
                    <button
                      onClick={closeAppointmentModal}
                      className={`${userRoleData?.role && selectedAppointment.status === 'scheduled' && (
                        (canViewOwnAppointmentsOnly(userRoleData.role) && selectedAppointment.user_id === userRoleData.user?.id) ||
                        (isPractitioner(userRoleData.role) && selectedAppointment.practitioner_id === userRoleData.user?.id)
                      ) ? 'flex-1' : 'w-full'} bg-gray-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Appointment Modal */}
        {showEditModal && selectedAppointment && userRoleData && (
          <EditAppointmentModal
            appointment={selectedAppointment}
            isClosing={isEditModalClosing}
            onClose={closeEditModal}
            onUpdate={loadAppointments}
            userRoleData={userRoleData}
          />
        )}

        {/* Create Appointment Modal */}
        {showCreateModal && selectedCreateDate && (
          <CreateAppointmentModal
            selectedDate={selectedCreateDate}
            isClosing={isCreateModalClosing}
            onClose={closeCreateModal}
            onUpdate={loadAppointments}
            userRoleData={userRoleData}
          />
        )}
      </main>
    </div>
  )
}


function CreateAppointmentModal({
  selectedDate,
  isClosing,
  onClose,
  onUpdate,
  userRoleData
}: {
  selectedDate: Date
  isClosing: boolean
  onClose: () => void
  onUpdate: () => void
  userRoleData: any
}) {
  const { showSuccess, showError } = useToast()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([])
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isExternalClient, setIsExternalClient] = useState<boolean>(false)
  const [externalClientInfo, setExternalClientInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [existingAppointments, setExistingAppointments] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  
  const loadExistingAppointments = useCallback(async () => {
    if (!selectedDate || !selectedPractitioner) {
      setExistingAppointments([])
      return
    }

    try {
      setLoadingSlots(true)
      
      
      setExistingAppointments([])
      
      
      const selectedDateStr = formatDateForAPI(selectedDate)
      
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .gte('appointment_date', `${selectedDateStr}T00:00:00`)
        .lt('appointment_date', `${selectedDateStr}T23:59:59`)
        .eq('practitioner_id', selectedPractitioner.id)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (error) throw error
      setExistingAppointments(data || [])
    } catch (err) {
      console.error('Error loading existing appointments:', err)
      setExistingAppointments([])
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedDate, selectedPractitioner])

  
  useEffect(() => {
    if (selectedDate && selectedPractitioner) {
      loadExistingAppointments()
    } else {
      setExistingAppointments([])
    }
  }, [selectedDate, selectedPractitioner, loadExistingAppointments])

  
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, practitionersData, clientsData] = await Promise.all([
          getServicesWithCategories(),
          supabase.from('users_with_roles').select('*').eq('role_name', 'practitioner').eq('is_active', true),
          supabase.from('users_with_roles').select('*').eq('role_name', 'client').eq('is_active', true)
        ])
        
        setServices(servicesData)
        setPractitioners(practitionersData.data || [])
        setClients(clientsData.data || [])
        
        
        if (userRoleData?.role?.name === 'practitioner') {
          
          const currentPractitioner = practitionersData.data?.find(p => p.id === userRoleData.user?.id)
          if (currentPractitioner) {
            setSelectedPractitioner(currentPractitioner)
          }
        } else if (userRoleData?.role?.name === 'super_admin' && practitionersData.data && practitionersData.data.length > 0) {
          
          setSelectedPractitioner(practitionersData.data[0])
        }
      } catch (err) {
        console.error('Error loading data:', err)
        showError('Failed to load data')
      }
    }
    
    loadData()
  }, [userRoleData])

  const handleServiceToggle = (service: ServiceWithCategory) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (selectedServices.length === 0) {
        showError('Please select at least one service')
        return
      }

      if (!selectedPractitioner) {
        showError('Please select a practitioner')
        return
      }

      if (!isExternalClient && !selectedClient) {
        showError('Please select a client or choose external client option')
        return
      }

      if (isExternalClient && (!externalClientInfo.firstName || !externalClientInfo.lastName || !externalClientInfo.phone)) {
        showError('Please fill in all required external client details')
        return
      }

      if (!selectedTimeSlot) {
        showError('Please select a time slot')
        return
      }

      
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number)
      const startTimeMinutes = hours * 60 + minutes
      const endTimeMinutes = startTimeMinutes + totalDuration
      const endHours = Math.floor(endTimeMinutes / 60)
      const endMins = endTimeMinutes % 60
      const endTimeString = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

      
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      const appointmentDateTime = new Date(`${dateString}T${selectedTimeSlot}`).toISOString()
      const endDateTime = new Date(`${dateString}T${endTimeString}`).toISOString()

      
      const appointmentData = {
        user_id: isExternalClient ? null : selectedClient!.id,
        practitioner_id: selectedPractitioner.id,
        appointment_date: appointmentDateTime,
        start_time: appointmentDateTime,
        end_time: endDateTime,
        status: 'scheduled',
        notes: notes || null,
        is_active: true,
        is_deleted: false,
        service_ids: selectedServices.map(s => s.id),
        service_id: selectedServices[0]?.id || null,
        is_external_client: isExternalClient,
        client_first_name: isExternalClient ? externalClientInfo.firstName : null,
        client_last_name: isExternalClient ? externalClientInfo.lastName : null,
        client_email: isExternalClient ? externalClientInfo.email : null,
        client_phone: isExternalClient ? externalClientInfo.phone : null
      }

      const { data: insertedAppointment, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select('id')
        .single()

      if (error) {
        showError(error.message || 'Failed to create appointment')
        return
      }

      
      try {
        await AppointmentSMSService.sendAppointmentNotifications(insertedAppointment.id, 'confirmation')
      } catch (smsError) {
        console.error('Error sending SMS notifications:', smsError)
      }

      try {
        await AppointmentCalendarService.createCalendarEvent(insertedAppointment.id)
      } catch (calendarError) {
        console.error('Error creating Google Calendar event:', calendarError)
      }

      showSuccess('Appointment created successfully!')
      setSuccess(true)
      setTimeout(() => {
        onUpdate()
        onClose()
      }, 1500)

    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-auto">
      {/* Backdrop - invisible but blocks clicks */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col ${
        isClosing
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
          <h3 className="text-lg font-semibold text-gray-900">
            Create Appointment
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointment Created!</h3>
              <p className="text-gray-600">The appointment has been successfully created.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Selected Date Display */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">Selected Date</h4>
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Service Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Services</h4>
                <div className="space-y-3">
                  {services.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id)
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleServiceToggle(service)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">{service.name}</h5>
                              {service.description && (
                                <p className="text-sm text-gray-600">{service.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">R{service.price || 0}</p>
                            <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Practitioner Selection */}
              {userRoleData?.role?.name === 'super_admin' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Practitioner</h4>
                  <select
                    value={selectedPractitioner?.id || ''}
                    onChange={(e) => {
                      const practitioner = practitioners.find(p => p.id === e.target.value)
                      setSelectedPractitioner(practitioner || null)
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Choose a practitioner</option>
                    {practitioners.map(practitioner => (
                      <option key={practitioner.id} value={practitioner.id}>
                        {practitioner.first_name} {practitioner.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Practitioner Display (for practitioners) */}
              {userRoleData?.role?.name === 'practitioner' && selectedPractitioner && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Practitioner</h4>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="text-gray-900">{selectedPractitioner.first_name} {selectedPractitioner.last_name}</p>
                  </div>
                </div>
              )}

              {/* Client Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Client</h4>
                
                {/* Client Type Toggle */}
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      checked={!isExternalClient}
                      onChange={() => setIsExternalClient(false)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Existing Client</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      checked={isExternalClient}
                      onChange={() => setIsExternalClient(true)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">New Client</span>
                  </label>
                </div>

                {/* Existing Client Selection */}
                {!isExternalClient && (
                  <select
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value)
                      setSelectedClient(client || null)
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required={!isExternalClient}
                  >
                    <option value="">Choose a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </select>
                )}

                {/* External Client Form */}
                {isExternalClient && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          value={externalClientInfo.firstName}
                          onChange={(e) => setExternalClientInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required={isExternalClient}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={externalClientInfo.lastName}
                          onChange={(e) => setExternalClientInfo(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required={isExternalClient}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={externalClientInfo.phone}
                        onChange={(e) => setExternalClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required={isExternalClient}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1"></label>
                      <input
                        type="email"
                        value={externalClientInfo.email}
                        onChange={(e) => setExternalClientInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Time</h4>
                {loadingSlots ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading available times...</span>
                  </div>
                ) : selectedPractitioner ? (
                  <TimeSlotSelector
                    key={`${selectedDate.toISOString()}-${selectedPractitioner.id}`}
                    selectedDate={selectedDate}
                    practitionerId={selectedPractitioner.id}
                    serviceDurationMinutes={selectedServices.reduce((total, service) => total + (service.duration_minutes || 0), 0)}
                    existingAppointments={existingAppointments}
                    onTimeSelect={setSelectedTimeSlot}
                    selectedTime={selectedTimeSlot}
                    disabled={loadingSlots}
                  />
                ) : (
                  <p className="text-sm text-gray-500">Please select a practitioner first</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes (Optional)</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special notes or requirements..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedServices.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                  <div className="space-y-2">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{service.name}</span>
                        <span className="text-gray-900">R{service.price || 0}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>R{getTotalPrice()}</span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Actions */}
        {!success && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || selectedServices.length === 0 || !selectedPractitioner || (!isExternalClient && !selectedClient) || (isExternalClient && (!externalClientInfo.firstName || !externalClientInfo.lastName || !externalClientInfo.phone)) || !selectedTimeSlot}
                className="flex-1 bg-indigo-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                {loading ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
