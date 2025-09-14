'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getServicesWithCategories, formatPrice, formatDuration } from '@/lib/services'
import { ServiceWithCategory } from '@/types'
import { supabase } from '@/lib/supabase'
import { DatePicker } from '@/components/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { isPractitioner } from '@/lib/rbac'
import { ValidationInput } from '@/components/validation/ValidationComponents'
import { ValidationService } from '@/lib/validation-service'
import TimeSlotSelector from '@/components/TimeSlotSelector'

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

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export default function AppointmentsPage() {
  const { user, userRoleData, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  
  // Booking form state
  const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([])
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  
  // External client information (for non-registered clients)
  const [isExternalClient, setIsExternalClient] = useState<boolean>(false)
  const [externalClientInfo, setExternalClientInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [externalClientFormErrors, setExternalClientFormErrors] = useState<Record<string, string>>({})
  
  // Determine booking flow based on user role
  const isPractitionerUser = isPractitioner(userRoleData?.role || null)
  const [bookingStep, setBookingStep] = useState<'service' | 'practitioner' | 'client' | 'datetime' | 'confirm'>('service')
  
  // Available time slots (now handled by TimeSlotSelector component)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Floating pill visibility
  const [showFloatingPill, setShowFloatingPill] = useState(true)

  // Load services, practitioners, and clients
  useEffect(() => {
    if (user) {
      loadServices()
      loadPractitioners()
      if (isPractitionerUser) {
        loadClients()
      }
    }
  }, [user, isPractitionerUser])

  // Pre-select service from URL parameter
  useEffect(() => {
    const serviceId = searchParams.get('serviceId')
    if (serviceId && services.length > 0) {
      const serviceToSelect = services.find(service => service.id === serviceId)
      if (serviceToSelect && !selectedServices.find(s => s.id === serviceId)) {
        setSelectedServices([serviceToSelect])
        // Remove the serviceId from URL to clean up the address bar
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('serviceId')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [services, searchParams, selectedServices])

  // Helper functions for date handling
  const getTomorrowDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of today
    return today
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 3)
    return maxDate
  }

  const formatDateForAPI = (date: Date | undefined) => {
    if (!date) return ''
    // Use local date formatting instead of UTC to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get existing appointments for conflict checking
  const [existingAppointments, setExistingAppointments] = useState<any[]>([])

  const loadExistingAppointments = useCallback(async () => {
    if (!selectedDate || !selectedPractitioner) {
      setExistingAppointments([])
      return
    }

    try {
      setLoadingSlots(true)
      
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', formatDateForAPI(selectedDate))
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

  // Load existing appointments when date or practitioner changes
  useEffect(() => {
    if (selectedDate && selectedPractitioner) {
      loadExistingAppointments()
    } else {
      setExistingAppointments([])
    }
  }, [selectedDate, selectedPractitioner, loadExistingAppointments])

  // Handle floating pill visibility based on scroll position
  useEffect(() => {
    if (bookingStep !== 'service' || selectedServices.length === 0) {
      setShowFloatingPill(true)
      return
    }

    const handleScroll = () => {
      const selectedServicesElement = document.getElementById('selected-services-section')
      if (!selectedServicesElement) {
        setShowFloatingPill(true)
        return
      }

      const rect = selectedServicesElement.getBoundingClientRect()
      const isVisible = rect.top <= window.innerHeight && rect.bottom >= 0
      
      // Hide pill when selected services section is visible, show when scrolling up
      setShowFloatingPill(!isVisible)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [bookingStep, selectedServices.length])

  const loadServices = async () => {
    try {
      setLoading(true)
      const servicesData = await getServicesWithCategories()
      setServices(servicesData)
    } catch (err) {
      showError('Failed to load services')
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
      showError('Failed to load practitioners')
      console.error('Error loading practitioners:', err)
    }
  }

  const loadClients = async () => {
    try {
      const { data: clientsData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('is_practitioner', false)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('first_name', { ascending: true })

      if (error) throw error
      setClients(clientsData || [])
    } catch (err) {
      showError('Failed to load clients')
      console.error('Error loading clients:', err)
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
      if (isPractitionerUser) {
        setBookingStep('client')
      } else {
        setBookingStep('practitioner')
      }
    }
  }

  const handleContinueToClient = () => {
    if (selectedServices.length > 0) {
      setBookingStep('client')
    }
  }

  const handleContinueToDateTime = () => {
    if (isPractitionerUser) {
      if (selectedServices.length > 0 && selectedClient) {
        setBookingStep('datetime')
      } else if (isExternalClient) {
        // Validate external client info using ValidationService
        const formData = {
          firstName: externalClientInfo.firstName,
          lastName: externalClientInfo.lastName,
          email: externalClientInfo.email,
          phone: externalClientInfo.phone
        }
        
        const validationResult = ValidationService.validateForm(formData, ValidationService.schemas.externalClient)
        
        if (validationResult.isValid) {
          setBookingStep('datetime')
        } else {
          setExternalClientFormErrors(validationResult.errors)
        }
      }
    } else {
      if (selectedServices.length > 0 && selectedPractitioner) {
        setBookingStep('datetime')
      }
    }
  }

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setBookingStep('confirm')
    }
  }

  const handleBookingConfirm = async () => {
    // Validate based on user role
    if (isPractitionerUser) {
      if (selectedServices.length === 0 || !selectedDate || !selectedTime || !user) return
      // For practitioners, either selectedClient or external client info must be provided
      if (!selectedClient && !isExternalClient) return
      if (isExternalClient && (!externalClientInfo.firstName || !externalClientInfo.lastName || (!externalClientInfo.email && !externalClientInfo.phone))) return
    } else {
      if (selectedServices.length === 0 || !selectedDate || !selectedTime || !selectedPractitioner || !user) return
    }

    try {
      // Calculate total duration for all services
      const totalDurationMinutes = selectedServices.reduce((total, service) => total + service.duration_minutes, 0)
      
      // Calculate end time based on total duration
      const startTime = new Date(`${formatDateForAPI(selectedDate)}T${selectedTime}`)
      const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000)
      const endTimeString = endTime.toTimeString().split(' ')[0]

      // Create appointment with all selected services
      const appointmentData = {
        user_id: isPractitionerUser ? (isExternalClient ? null : selectedClient!.id) : user.id,
        practitioner_id: isPractitionerUser ? user.id : selectedPractitioner!.id,
        appointment_date: formatDateForAPI(selectedDate),
        start_time: selectedTime,
        end_time: endTimeString,
        status: 'scheduled',
        notes: notes || null,
        is_active: true,
        is_deleted: false,
        // Store service IDs as JSON array
        service_ids: selectedServices.map(s => s.id),
        // For backward compatibility, set service_id to first service
        service_id: selectedServices[0]?.id || null,
        // External client information
        is_external_client: isPractitionerUser && isExternalClient,
        client_first_name: isPractitionerUser && isExternalClient ? externalClientInfo.firstName : null,
        client_last_name: isPractitionerUser && isExternalClient ? externalClientInfo.lastName : null,
        client_email: isPractitionerUser && isExternalClient ? externalClientInfo.email : null,
        client_phone: isPractitionerUser && isExternalClient ? externalClientInfo.phone : null
      }

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData])

      if (error) throw error

      showSuccess('Appointment booked successfully! Redirecting...')
      
      // Reset form
      setSelectedServices([])
      setSelectedPractitioner(practitioners.length === 1 ? practitioners[0] : null)
      setSelectedClient(null)
      setSelectedDate(undefined)
      setSelectedTime('')
      setNotes('')
      setIsExternalClient(false)
      setExternalClientInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      })
      setExternalClientFormErrors({})
      setBookingStep('service')
      
      // Redirect based on user role
      setTimeout(() => {
        if (isPractitionerUser) {
          router.push('/appointments-management')
        } else {
          router.push('/')
        }
      }, 2000)
      
    } catch (err) {
      showError('Failed to book appointment. Please try again.')
      console.error('Error booking appointment:', err)
    }
  }

  const formatTimeDisplay = (time: string): string => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Progress Steps */}
        <div className="mb-8">
          {/* Desktop Progress Steps */}
          <div className="hidden md:flex items-center justify-center space-x-6">
            <div className={`flex items-center ${bookingStep === 'service' ? 'text-indigo-600' : bookingStep === 'practitioner' || bookingStep === 'client' || bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'service' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'practitioner' || bookingStep === 'client' || bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Services</span>
            </div>
            
            {!isPractitionerUser && (
              <div className={`flex items-center ${bookingStep === 'practitioner' ? 'text-indigo-600' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'practitioner' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Practitioner</span>
              </div>
            )}
            
            {isPractitionerUser && (
              <div className={`flex items-center ${bookingStep === 'client' ? 'text-indigo-600' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'client' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Client</span>
              </div>
            )}
            
            <div className={`flex items-center ${bookingStep === 'datetime' ? 'text-indigo-600' : bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'datetime' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                {isPractitionerUser ? '3' : '3'}
              </div>
              <span className="ml-2 text-sm font-medium">Date & Time</span>
            </div>
            
            <div className={`flex items-center ${bookingStep === 'confirm' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${bookingStep === 'confirm' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                {isPractitionerUser ? '4' : '4'}
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>

          {/* Mobile Progress Steps */}
          <div className="md:hidden">
            {/* Mobile Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: bookingStep === 'service' ? '25%' : 
                         bookingStep === 'datetime' ? '50%' : 
                         bookingStep === 'confirm' ? '75%' : '100%' 
                }}
              ></div>
            </div>
            
            {/* Mobile Step Indicators */}
            <div className="flex items-center justify-between">
              <div className={`flex flex-col items-center ${bookingStep === 'service' ? 'text-indigo-600' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mb-1 ${bookingStep === 'service' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'datetime' || bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                  1
                </div>
                <span className="text-xs font-medium text-center">Services</span>
              </div>
              
              <div className={`flex flex-col items-center ${bookingStep === 'datetime' ? 'text-indigo-600' : bookingStep === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mb-1 ${bookingStep === 'datetime' ? 'border-indigo-600 bg-indigo-600 text-white' : bookingStep === 'confirm' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="text-xs font-medium text-center">Date & Time</span>
              </div>
              
              <div className={`flex flex-col items-center ${bookingStep === 'confirm' ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mb-1 ${bookingStep === 'confirm' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                  3
                </div>
                <span className="text-xs font-medium text-center">Confirm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Service Selection */}
        {bookingStep === 'service' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Choose Services</h2>
              {selectedServices.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Sticky Category Navigation Bar */}
            <div className="sticky top-0 z-10 bg-gray-50 py-4 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2">
                {Object.entries(
                  services.reduce((acc, service) => {
                    const categoryName = service.category_name || 'Other Services'
                    if (!acc[categoryName]) {
                      acc[categoryName] = []
                    }
                    acc[categoryName].push(service)
                    return acc
                  }, {} as { [key: string]: ServiceWithCategory[] })
                )
                  .sort(([, servicesA], [, servicesB]) => {
                    const orderA = servicesA[0]?.category_display_order || 999
                    const orderB = servicesB[0]?.category_display_order || 999
                    return orderA - orderB
                  })
                  .map(([categoryName]) => (
                    <button
                      key={categoryName}
                      onClick={() => {
                        const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`)
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap shadow-sm"
                    >
                      {categoryName}
                    </button>
                  ))}
              </div>
            </div>
            
            <div className="space-y-8">
              {Object.entries(
                services.reduce((acc, service) => {
                  const categoryName = service.category_name || 'Other Services'
                  if (!acc[categoryName]) {
                    acc[categoryName] = []
                  }
                  acc[categoryName].push(service)
                  return acc
                }, {} as { [key: string]: ServiceWithCategory[] })
              )
                .sort(([, servicesA], [, servicesB]) => {
                  const orderA = servicesA[0]?.category_display_order || 999
                  const orderB = servicesB[0]?.category_display_order || 999
                  return orderA - orderB
                })
                .map(([categoryName, categoryServices]) => (
                  <div key={categoryName} id={`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-4">
                    {/* Category Header */}
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{categoryName}</h3>
                      {categoryServices[0]?.category_description && (
                        <p className="text-sm text-gray-600 mt-1">{categoryServices[0].category_description}</p>
                      )}
                    </div>

                    {/* Services Grid for this category */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryServices.map((service) => {
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
                            <div className="p-4 sm:p-6">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {service.name}
                                </h4>
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
                                <div className="text-lg font-bold text-gray-900">
                                  {formatPrice(service.price || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
            
            {selectedServices.length > 0 && (
              <div id="selected-services-section" className="mt-6 sm:mt-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
                <div className="space-y-3">
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
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
                        <p className="font-semibold text-gray-900">{formatPrice(service.price || 0)}</p>
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
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(selectedServices.reduce((total, service) => total + (service.price || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleContinueToPractitioner}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
                  >
                    Continue to {isPractitionerUser ? 'Client' : 'Practitioner'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Action Pill - Only show on service selection step when services are selected */}
        {bookingStep === 'service' && selectedServices.length > 0 && (
          <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${
            showFloatingPill ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            <button
              onClick={() => {
                const element = document.getElementById('selected-services-section')
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center space-x-2 font-medium min-w-[280px]"
            >
              <span>{selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
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
                    <div className="text-gray-900 font-semibold">
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
                    <p className="text-lg font-bold text-gray-900">
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
                  className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
                >
                  Continue to Date & Time
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2.5: Client Selection (for practitioners) */}
        {bookingStep === 'client' && isPractitionerUser && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setBookingStep('service')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Change Services
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Client</h2>
            
            {/* External Client Option */}
            <div className="mb-6">
              <div
                onClick={() => {
                  setIsExternalClient(true)
                  setSelectedClient(null)
                }}
                className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  isExternalClient 
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      New Client (Not Registered)
                    </h3>
                    {isExternalClient && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Book appointment for a client who is not registered in the system</p>
                </div>
              </div>
            </div>

            {/* External Client Form */}
            {isExternalClient && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidationInput
                    label="First Name"
                    required
                    error={externalClientFormErrors.firstName}
                    name="firstName"
                    type="text"
                    value={externalClientInfo.firstName}
                    onChange={(e) => {
                      setExternalClientInfo({...externalClientInfo, firstName: e.target.value})
                      if (externalClientFormErrors.firstName) {
                        setExternalClientFormErrors({...externalClientFormErrors, firstName: ''})
                      }
                    }}
                    placeholder="Enter first name"
                  />
                  <ValidationInput
                    label="Last Name"
                    required
                    error={externalClientFormErrors.lastName}
                    name="lastName"
                    type="text"
                    value={externalClientInfo.lastName}
                    onChange={(e) => {
                      setExternalClientInfo({...externalClientInfo, lastName: e.target.value})
                      if (externalClientFormErrors.lastName) {
                        setExternalClientFormErrors({...externalClientFormErrors, lastName: ''})
                      }
                    }}
                    placeholder="Enter last name"
                  />
                  <ValidationInput
                    label="Email"
                    error={externalClientFormErrors.email}
                    name="email"
                    type="email"
                    value={externalClientInfo.email}
                    onChange={(e) => {
                      setExternalClientInfo({...externalClientInfo, email: e.target.value})
                      if (externalClientFormErrors.email) {
                        setExternalClientFormErrors({...externalClientFormErrors, email: ''})
                      }
                      if (externalClientFormErrors.contactMethod) {
                        setExternalClientFormErrors({...externalClientFormErrors, contactMethod: ''})
                      }
                    }}
                    placeholder="Enter email address"
                  />
                  <ValidationInput
                    label="Phone"
                    error={externalClientFormErrors.phone}
                    name="phone"
                    type="tel"
                    value={externalClientInfo.phone}
                    onChange={(e) => {
                      setExternalClientInfo({...externalClientInfo, phone: e.target.value})
                      if (externalClientFormErrors.phone) {
                        setExternalClientFormErrors({...externalClientFormErrors, phone: ''})
                      }
                      if (externalClientFormErrors.contactMethod) {
                        setExternalClientFormErrors({...externalClientFormErrors, contactMethod: ''})
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  * At least one contact method (email or phone) is required
                </p>
                {externalClientFormErrors.contactMethod && (
                  <p className="text-red-500 text-sm mt-2">{externalClientFormErrors.contactMethod}</p>
                )}
              </div>
            )}

            {/* Registered Clients */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Clients</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client)
                      setIsExternalClient(false)
                    }}
                    className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                      selectedClient?.id === client.id 
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {client.first_name} {client.last_name}
                        </h3>
                        {selectedClient?.id === client.id && (
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
                        <p className="text-sm text-gray-600">{client.email}</p>
                        <p className="text-sm text-gray-600">{client.phone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleContinueToDateTime}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
              >
                Continue to Date & Time
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date & Time Selection */}
        {bookingStep === 'datetime' && selectedServices.length > 0 && ((isPractitionerUser && (selectedClient || isExternalClient)) || (!isPractitionerUser && selectedPractitioner)) && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setBookingStep(isPractitionerUser ? 'client' : 'practitioner')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Change {isPractitionerUser ? 'Client' : 'Practitioner'}
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
                        <div className="text-gray-900 font-semibold">
                          {formatPrice(service.price || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{isPractitionerUser ? 'Client' : 'Practitioner'}</h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {isPractitionerUser ? (
                      <>
                        {isExternalClient ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {externalClientInfo.firstName} {externalClientInfo.lastName}
                            </p>
                            {externalClientInfo.email && (
                              <p className="text-sm text-gray-600">{externalClientInfo.email}</p>
                            )}
                            {externalClientInfo.phone && (
                              <p className="text-sm text-gray-600">{externalClientInfo.phone}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">(External Client)</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">
                              {selectedClient?.first_name} {selectedClient?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{selectedClient?.email}</p>
                            <p className="text-sm text-gray-600">{selectedClient?.phone}</p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">
                          {selectedPractitioner?.first_name} {selectedPractitioner?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{selectedPractitioner?.email}</p>
                        <p className="text-sm text-gray-600">{selectedPractitioner?.phone}</p>
                      </>
                    )}
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
                    <p className="text-lg font-bold text-gray-900">
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
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Select Date
                </label>
                <DatePicker
                  date={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date)
                    setSelectedTime('')
                  }}
                  placeholder="Pick a date"
                  minDate={getTomorrowDate()}
                  maxDate={getMaxDate()}
                  className="w-full max-w-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  You can book appointments from tomorrow up to 3 months in advance
                </p>
              </div>

              {/* Time Selection */}
              {selectedDate && selectedPractitioner && (
                <TimeSlotSelector
                  selectedDate={selectedDate}
                  practitionerId={selectedPractitioner.id}
                  serviceDurationMinutes={selectedServices.reduce((total, service) => total + (service.duration_minutes || 0), 0)}
                  existingAppointments={existingAppointments}
                  onTimeSelect={setSelectedTime}
                  selectedTime={selectedTime}
                  disabled={loadingSlots}
                />
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Notes (Optional)
                </label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes for your appointment..."
                  className="resize-none"
                />
              </div>

              {/* Continue Button */}
              {selectedDate && selectedTime && (
                <div className="flex justify-end">
                  <button
                    onClick={handleDateTimeConfirm}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {bookingStep === 'confirm' && selectedServices.length > 0 && ((isPractitionerUser && (selectedClient || isExternalClient)) || (!isPractitionerUser && selectedPractitioner)) && selectedDate && selectedTime && (
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
                        <p className="font-semibold text-gray-900">{formatPrice(service.price || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-900 font-medium">{isPractitionerUser ? 'Client:' : 'Practitioner:'}</span>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    {isPractitionerUser ? (
                      <>
                        {isExternalClient ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {externalClientInfo.firstName} {externalClientInfo.lastName}
                            </p>
                            {externalClientInfo.email && (
                              <p className="text-sm text-gray-600">{externalClientInfo.email}</p>
                            )}
                            {externalClientInfo.phone && (
                              <p className="text-sm text-gray-600">{externalClientInfo.phone}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">(External Client)</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">
                              {selectedClient?.first_name} {selectedClient?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{selectedClient?.email}</p>
                            <p className="text-sm text-gray-600">{selectedClient?.phone}</p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">
                          {selectedPractitioner?.first_name} {selectedPractitioner?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{selectedPractitioner?.email}</p>
                        <p className="text-sm text-gray-600">{selectedPractitioner?.phone}</p>
                      </>
                    )}
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
                  <span className="font-medium text-gray-900">{formatTimeDisplay(selectedTime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">End Time:</span>
                  <span className="font-medium text-gray-900">
                    {formatTimeDisplay(new Date(new Date(`${formatDateForAPI(selectedDate)}T${selectedTime}`).getTime() + selectedServices.reduce((total, service) => total + service.duration_minutes, 0) * 60000).toTimeString().split(' ')[0])}
                  </span>
                </div>
                
                <div className="flex justify-between border-t pt-4">
                  <span className="text-gray-900 font-medium">Total Price:</span>
                  <span className="font-bold text-gray-900 text-xl">
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

            <div className="flex space-x-3">
              <button
                onClick={() => setBookingStep('service')}
                className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 lg:px-6 lg:py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium text-sm lg:text-base transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleBookingConfirm}
                className="flex-1 bg-green-600 text-white px-3 py-2 lg:px-8 lg:py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium text-sm lg:text-base transition-colors"
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