'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ServiceWithCategory, AppointmentExtended, ViewMode } from '@/types'
import { formatDuration } from '@/lib/services'
import { getFilteredAppointments, isPractitioner, canViewOwnAppointmentsOnly } from '@/lib/rbac'
import EditAppointmentModal from '@/components/EditAppointmentModal'

export default function AppointmentsPage() {
  const { user, loading: authLoading, userRoleData } = useAuth()
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

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!user || !userRoleData) {
        setAppointments([])
        return
      }

      // Calculate date range based on view mode
      const { startDate, endDate } = getDateRange(currentDate, viewMode)
      
      // Use role-based filtering
      const appointmentsData = await getFilteredAppointments(user.id, userRoleData.role)
      
      // Filter by date range
      const filteredAppointments = appointmentsData.filter(apt => {
        const aptDate = apt.appointment_date
        // Extract just the date part from timestamptz for comparison
        const aptDateOnly = aptDate.split('T')[0]
        return aptDateOnly >= startDate && aptDateOnly <= endDate
      })

      // Load service details for each appointment
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

  // Load appointments
  useEffect(() => {
    if (user && userRoleData) {
      loadAppointments()
    }
  }, [user, userRoleData, loadAppointments])

  const getDateRange = (date: Date, mode: ViewMode) => {
    const startDate = new Date(date)
    const endDate = new Date(date)

    switch (mode) {
      case 'day':
        // Same day
        break
      case 'week':
        // Start of week to end of week
        const dayOfWeek = startDate.getDay()
        startDate.setDate(startDate.getDate() - dayOfWeek)
        endDate.setDate(endDate.getDate() + (6 - dayOfWeek))
        break
      case 'month':
        // Start of month to end of month
        startDate.setDate(1)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
        break
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const formatTime = (time: string): string => {
    // If we have a datetime string, extract time and convert to local timezone
    if (time.includes('T') || time.includes('Z')) {
      const date = new Date(time)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
    // Fallback to old time parsing for backward compatibility
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatDate = (date: string): string => {
    // If we have the new datetime column, use it for proper timezone handling
    if (date.includes('T') || date.includes('Z')) {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
    // Fallback to old date parsing for backward compatibility
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

  // Helper function to get the appropriate user info to display based on current user's role
  const getDisplayUserInfo = (appointment: AppointmentExtended) => {
    
    if (!userRoleData?.role) return appointment.client

    // If current user is a client, show practitioner info
    if (canViewOwnAppointmentsOnly(userRoleData.role)) {
      return appointment.practitioner
    }
    // If current user is a practitioner, show client info (handle external clients)
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
    // If super admin, show client info by default (handle external clients)
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
    setShowEditModal(true)
    setShowAppointmentModal(false)
  }

  const closeEditModal = () => {
    setIsEditModalClosing(true)
    setTimeout(() => {
      setShowEditModal(false)
      setIsEditModalClosing(false)
    }, 300)
  }

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter(apt => {
      // Handle timestamptz columns - extract date part for comparison
      if (apt.appointment_date && apt.appointment_date.includes('T')) {
        const aptDate = new Date(apt.appointment_date).toISOString().split('T')[0]
        return aptDate === date
      }
      // Fallback for old format
      return apt.appointment_date === date
    })
  }

  const getAppointmentsForTimeSlot = (date: string, hour: number) => {
    return appointments.filter(apt => {
      // Handle timestamptz columns
      if (apt.appointment_date && apt.appointment_date.includes('T')) {
        const aptDate = new Date(apt.appointment_date).toISOString().split('T')[0]
        if (aptDate !== date) return false
        const aptStartTime = new Date(apt.start_time)
        const startHour = aptStartTime.getHours()
        return startHour === hour
      }
      // Fallback for old format
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
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h2>
        </div>
        
        {/* Desktop: 7-column grid */}
        <div className="hidden lg:grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dateStr = formatDateForDB(day)
            const dayAppointments = getAppointmentsForDate(dateStr)
            
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {day.getDate()}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center">No appointments</p>
                  ) : (
                    dayAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={() => handleAppointmentClick(appointment)}
                        className="p-2 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {getDisplayUserInfo(appointment)?.first_name || 'Unknown'} {getDisplayUserInfo(appointment)?.last_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatTime(appointment.start_time)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile: Vertical list with horizontal scroll */}
        <div className="lg:hidden">
          <div className="flex space-x-3 overflow-x-auto pb-4">
            {weekDays.map((day, index) => {
              const dateStr = formatDateForDB(day)
              const dayAppointments = getAppointmentsForDate(dateStr)
              const isToday = day.toDateString() === new Date().toDateString()
              
              return (
                <div key={index} className={`flex-shrink-0 w-64 bg-white rounded-lg border p-4 ${
                  isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="text-center mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {day.toLocaleDateString('en-US', { weekday: 'long' })}
                    </h3>
                    <p className={`text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {dayAppointments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No appointments</p>
                    ) : (
                      dayAppointments.map(appointment => (
                        <div
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
                          className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900">
                              {getDisplayUserInfo(appointment)?.first_name || 'Unknown'} {getDisplayUserInfo(appointment)?.last_name || 'User'}
                            </p>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {formatTime(appointment.start_time)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
    
    // Get all appointments for the current month
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
                    className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
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
                          onClick={() => handleAppointmentClick(appointment)}
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
                  <div key={date.toISOString()} className="bg-white rounded-lg border border-gray-200 p-4">
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
                      {appointments.map(appointment => (
                        <div
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
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
        <div className="mb-8">
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
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}

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
                    // Client viewing appointments - show practitioner info first
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
                    // Practitioner or admin viewing appointments - show client info first
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
      </main>
    </div>
  )
}
