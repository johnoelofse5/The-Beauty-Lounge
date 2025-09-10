'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getServicesWithCategories, formatPrice, formatDuration } from '@/lib/services'
import { ServiceWithCategory } from '@/types'
import { supabase } from '@/lib/supabase'

interface TimeSlot {
  time: string
  available: boolean
}

interface Practitioner {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

interface AppointmentBooking {
  service_ids: string[]
  appointment_date: string
  start_time: string
  practitioner_id: string
  notes?: string
}

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Auto-dismiss messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])
  
  // Booking form state
  const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([])
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [bookingStep, setBookingStep] = useState<'service' | 'practitioner' | 'datetime' | 'confirm'>('service')
  
  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Load services and practitioners
  useEffect(() => {
    if (user) {
      loadServices()
      loadPractitioners()
    }
  }, [user])

  // Load available time slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedServices.length > 0 && selectedPractitioner) {
      loadAvailableSlots()
    }
  }, [selectedDate, selectedServices, selectedPractitioner])

  // Clear available slots when practitioner changes (if date is already selected)
  useEffect(() => {
    if (selectedDate && selectedServices.length > 0 && selectedPractitioner) {
      setAvailableSlots([])
      setSelectedTime('')
    }
  }, [selectedPractitioner])

  const loadServices = async () => {
    try {
      setLoading(true)
      const servicesData = await getServicesWithCategories()
      setServices(servicesData)
    } catch (err) {
      setError('Failed to load services')
      console.error('Error loading services:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPractitioners = async () => {
    try {
      const { data: practitionersData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('is_practitioner', true)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('first_name', { ascending: true })

      if (error) throw error

      setPractitioners(practitionersData || [])
      
      // If there's only one practitioner, auto-select them
      if (practitionersData && practitionersData.length === 1) {
        setSelectedPractitioner(practitionersData[0])
      }
    } catch (err) {
      setError('Failed to load practitioners')
      console.error('Error loading practitioners:', err)
    }
  }

  const loadAvailableSlots = async () => {
    if (!selectedDate || selectedServices.length === 0 || !selectedPractitioner) return

    try {
      setLoadingSlots(true)
      
      // Calculate total duration for all selected services
      const totalDurationMinutes = selectedServices.reduce((total, service) => total + service.duration_minutes, 0)
      
      // Get existing appointments for the selected date and practitioner
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', selectedDate)
        .eq('practitioner_id', selectedPractitioner.id)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (error) throw error

      // Generate time slots (9 AM to 5 PM, 30-minute intervals)
      const slots: TimeSlot[] = []
      const startHour = 9
      const endHour = 17
      const intervalMinutes = 30

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
          
          // Calculate end time for this slot with all selected services
          const startTime = new Date(`${selectedDate}T${timeString}`)
          const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000)
          const endTimeString = endTime.toTimeString().split(' ')[0]
          
          // Check if this slot conflicts with existing appointments
          const isAvailable = !existingAppointments?.some(apt => {
            const aptStart = apt.start_time
            const aptEnd = apt.end_time
            // Check if our appointment would overlap with existing ones
            return (timeString < aptEnd && endTimeString > aptStart)
          })

          // Also check if the appointment would extend beyond business hours
          const businessEndTime = `${endHour.toString().padStart(2, '0')}:00:00`
          const withinBusinessHours = endTimeString <= businessEndTime

          slots.push({
            time: timeString,
            available: isAvailable && withinBusinessHours
          })
        }
      }

      setAvailableSlots(slots)
    } catch (err) {
      console.error('Error loading time slots:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleServiceSelect = (service: ServiceWithCategory) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        // Remove service if already selected
        return prev.filter(s => s.id !== service.id)
      } else {
        // Add service if not selected
        return [...prev, service]
      }
    })
  }

  const handleContinueToPractitioner = () => {
    if (selectedServices.length > 0) {
      setBookingStep('practitioner')
    }
  }

  const handleContinueToDateTime = () => {
    if (selectedServices.length > 0 && selectedPractitioner) {
      setBookingStep('datetime')
    }
  }

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setBookingStep('confirm')
    }
  }

  const handleBookingConfirm = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !selectedPractitioner || !user) return

    try {
      // Calculate total duration for all services
      const totalDurationMinutes = selectedServices.reduce((total, service) => total + service.duration_minutes, 0)
      
      // Calculate end time based on total duration
      const startTime = new Date(`${selectedDate}T${selectedTime}`)
      const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000)
      const endTimeString = endTime.toTimeString().split(' ')[0]

      // Create appointment with all selected services
      const appointmentData = {
        user_id: user.id,
        practitioner_id: selectedPractitioner.id,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTimeString,
        status: 'scheduled',
        notes: notes || null,
        is_active: true,
        is_deleted: false,
        // Store service IDs as JSON array
        service_ids: selectedServices.map(s => s.id),
        // For backward compatibility, set service_id to first service
        service_id: selectedServices[0]?.id || null
      }

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData])

      if (error) throw error

      setSuccess('Appointment booked successfully! Redirecting to home page...')
      
      // Reset form
      setSelectedServices([])
      setSelectedPractitioner(practitioners.length === 1 ? practitioners[0] : null)
      setSelectedDate('')
      setSelectedTime('')
      setNotes('')
      setBookingStep('service')
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (err) {
      setError('Failed to book appointment. Please try again.')
      console.error('Error booking appointment:', err)
    }
  }

  const formatTimeSlot = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = (): string => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 3) // 3 months ahead
    return maxDate.toISOString().split('T')[0]
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You must be logged in to book appointments.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500">
                ← Back to Home
              </Link>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Book Appointment
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-6">
            <div className={`flex items-center ${bookingStep === 'service' ? 'text-indigo-600' : bookingStep === 'practitioner' || bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'service' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'practitioner' || bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Services</span>
            </div>
            
            <div className={`flex items-center ${bookingStep === 'practitioner' ? 'text-indigo-600' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'practitioner' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Practitioner</span>
            </div>
            
            <div className={`flex items-center ${bookingStep === 'datetime' ? 'text-indigo-600' : bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'datetime' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Date & Time</span>
            </div>
            
            <div className={`flex items-center ${bookingStep === 'confirm' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'confirm' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                4
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Service Selection */}
        {bookingStep === 'service' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose Services</h2>
              {selectedServices.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id)
                return (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {service.name}
                        </h3>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {formatDuration(service.duration_minutes)}
                        </div>
                        <div className="text-lg font-bold text-indigo-600">
                          {formatPrice(service.price || 0)}
                        </div>
                      </div>
                      {service.category_name && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.category_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {selectedServices.length > 0 && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
                <div className="space-y-3">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-600">{formatPrice(service.price || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Total Duration:</p>
                      <p className="text-sm text-gray-500">
                        {formatDuration(selectedServices.reduce((total, service) => total + service.duration_minutes, 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Total Price:</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleContinueToPractitioner}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
                  >
                    Continue to Practitioner
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Practitioner Selection */}
        {bookingStep === 'practitioner' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setBookingStep('service')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Change Services
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
              <div className="space-y-2">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-700">{formatDuration(service.duration_minutes)}</p>
                    </div>
                    <div className="text-indigo-600 font-semibold">
                      {formatPrice(service.price || 0)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Duration:</p>
                    <p className="text-sm text-gray-900">
                      {formatDuration(selectedServices.reduce((total, service) => total + service.duration_minutes, 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Total Price:</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Practitioner</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {practitioners.map((practitioner) => (
                <div
                  key={practitioner.id}
                  onClick={() => setSelectedPractitioner(practitioner)}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    selectedPractitioner?.id === practitioner.id 
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {practitioner.first_name} {practitioner.last_name}
                      </h3>
                      {selectedPractitioner?.id === practitioner.id && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{practitioner.email}</p>
                      <p className="text-sm text-gray-600">{practitioner.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedPractitioner && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleContinueToDateTime}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
                >
                  Continue to Date & Time
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date & Time Selection */}
        {bookingStep === 'datetime' && selectedServices.length > 0 && selectedPractitioner && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setBookingStep('practitioner')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Change Practitioner
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Services</h4>
                  <div className="space-y-2">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-700">{formatDuration(service.duration_minutes)}</p>
                        </div>
                        <div className="text-indigo-600 font-semibold">
                          {formatPrice(service.price || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Practitioner</h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium text-gray-900">
                      {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{selectedPractitioner.email}</p>
                    <p className="text-sm text-gray-600">{selectedPractitioner.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Duration:</p>
                    <p className="text-sm text-gray-900">
                      {formatDuration(selectedServices.reduce((total, service) => total + service.duration_minutes, 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Total Price:</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Date & Time</h2>
            
            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  min={getTomorrowDate()}
                  max={getMaxDate()}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedTime('')
                  }}
                  className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can book appointments from tomorrow up to 3 months in advance
                </p>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Available Time Slots
                  </label>
                  {loadingSlots ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      <span className="text-sm text-gray-900">
                        Checking {selectedPractitioner.first_name} {selectedPractitioner.last_name}'s availability...
                      </span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">
                        No available time slots for {selectedPractitioner.first_name} {selectedPractitioner.last_name} on this date
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Please try a different date or practitioner
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                            selectedTime === slot.time
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : slot.available
                              ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {formatTimeSlot(slot.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes for your appointment..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Continue Button */}
              {selectedDate && selectedTime && (
                <div className="flex justify-end">
                  <button
                    onClick={handleDateTimeConfirm}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {bookingStep === 'confirm' && selectedServices.length > 0 && selectedPractitioner && selectedDate && selectedTime && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setBookingStep('datetime')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Change Date & Time
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Appointment</h2>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-gray-900 font-medium">Services:</span>
                  <div className="mt-2 space-y-2">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-700">{formatDuration(service.duration_minutes)}</p>
                        </div>
                        <p className="font-semibold text-indigo-600">{formatPrice(service.price || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-900 font-medium">Practitioner:</span>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium text-gray-900">
                      {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{selectedPractitioner.email}</p>
                    <p className="text-sm text-gray-600">{selectedPractitioner.phone}</p>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Total Duration:</span>
                  <span className="font-medium text-gray-900">
                    {formatDuration(selectedServices.reduce((total, service) => total + service.duration_minutes, 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Start Time:</span>
                  <span className="font-medium text-gray-900">{formatTimeSlot(selectedTime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">End Time:</span>
                  <span className="font-medium text-gray-900">
                    {formatTimeSlot(new Date(new Date(`${selectedDate}T${selectedTime}`).getTime() + selectedServices.reduce((total, service) => total + service.duration_minutes, 0) * 60000).toTimeString().split(' ')[0])}
                  </span>
                </div>
                
                <div className="flex justify-between border-t pt-4">
                  <span className="text-gray-900 font-medium">Total Price:</span>
                  <span className="font-bold text-indigo-600 text-xl">
                    {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0))}
                  </span>
                </div>
                
                {notes && (
                  <div>
                    <span className="text-gray-900 font-medium">Notes:</span>
                    <p className="mt-1 text-sm text-gray-900">{notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setBookingStep('service')}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium"
              >
                Start Over
              </button>
              <button
                onClick={handleBookingConfirm}
                className="bg-green-600 text-white px-8 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 