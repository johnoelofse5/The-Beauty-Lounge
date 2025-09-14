'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ServiceWithCategory } from '@/types'
import { formatDuration, formatPrice, getServicesWithCategories } from '@/lib/services'
import { DatePicker } from '@/components/date-picker'
import { hasPermission, isPractitioner } from '@/lib/rbac'
import TimeSlotSelector from '@/components/TimeSlotSelector'

interface Appointment {
    id: string
    user_id: string | null
    practitioner_id: string
    service_id: string | null
    service_ids: string[]
    appointment_date: string
    start_time: string
    end_time: string
    status: string
    notes: string | null
    is_active: boolean
    is_deleted: boolean
    created_at: string
    updated_at: string
    // External client information
    client_first_name?: string
    client_last_name?: string
    client_email?: string
    client_phone?: string
    is_external_client?: boolean
    client: {
        first_name: string
        last_name: string
        email: string
        phone?: string
    } | null
    practitioner: {
        first_name: string
        last_name: string
        email: string
        phone?: string
    } | null
    services?: ServiceWithCategory[]
}

interface EditAppointmentModalProps {
    appointment: Appointment
    isClosing: boolean
    onClose: () => void
    onUpdate: () => void
    userRoleData: {
        role: {
            id: string
            name: string
            description: string
        } | null
        permissions: Array<{
            id: string
            name: string
            resource: string
            action: string
        }>
    }
}

export default function EditAppointmentModal({
    appointment,
    isClosing,
    onClose,
    onUpdate,
    userRoleData
}: EditAppointmentModalProps) {
    const [services, setServices] = useState<ServiceWithCategory[]>([])
    const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([])
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
    const [existingAppointments, setExistingAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Initialize form with current appointment data
    useEffect(() => {
        if (appointment) {
            setSelectedDate(new Date(appointment.appointment_date))
            setSelectedTimeSlot(appointment.start_time)
            setSelectedServices(appointment.services || [])
        }
    }, [appointment])

    // Load all available services
    useEffect(() => {
        const loadServices = async () => {
            try {
                const servicesData = await getServicesWithCategories()
                setServices(servicesData)
            } catch (err) {
                console.error('Error loading services:', err)
            }
        }

        loadServices()
    }, [])

    // Load existing appointments when date changes
    useEffect(() => {
        if (selectedDate && appointment?.practitioner) {
            loadExistingAppointments()
        } else {
            setExistingAppointments([])
        }
    }, [selectedDate, appointment?.practitioner])

    const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const loadExistingAppointments = async () => {
        if (!selectedDate || !appointment?.practitioner) {
            setExistingAppointments([])
            return
        }

        try {
            setLoading(true)
            
            const { data, error } = await supabase
                .from('appointments')
                .select('start_time, end_time')
                .eq('appointment_date', formatDateForAPI(selectedDate))
                .eq('practitioner_id', appointment.practitioner_id)
                .eq('is_active', true)
                .eq('is_deleted', false)
                .neq('id', appointment.id) // Exclude current appointment

            if (error) throw error
            setExistingAppointments(data || [])
        } catch (err) {
            console.error('Error loading existing appointments:', err)
            setExistingAppointments([])
        } finally {
            setLoading(false)
        }
    }

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
        setError(null)
        setLoading(true)

        try {
            if (selectedServices.length === 0) {
                throw new Error('Please select at least one service')
            }

            if (!selectedDate || !selectedTimeSlot) {
                throw new Error('Please select a date and time')
            }

            // Calculate end time based on total service duration
            const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
            const startTime = new Date(`2000-01-01T${selectedTimeSlot}`)
            const endTime = new Date(startTime.getTime() + totalDuration * 60000)
            const endTimeString = endTime.toTimeString().split(' ')[0]

            // Format date for database
            const dateString = selectedDate.toISOString().split('T')[0]

            // Update the appointment
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    service_ids: selectedServices.map(s => s.id),
                    appointment_date: dateString,
                    start_time: selectedTimeSlot,
                    end_time: endTimeString,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointment.id)

            if (updateError) throw updateError

            setSuccess(true)
            setTimeout(() => {
                onUpdate()
                onClose()
            }, 1500)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update appointment')
        } finally {
            setLoading(false)
        }
    }

    const getTotalPrice = () => {
        return selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
    }

    const handleDeleteAppointment = async () => {
        setDeleting(true)
        setError(null)

        try {
            const { error: deleteError } = await supabase
                .from('appointments')
                .update({
                    is_deleted: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointment.id)

            if (deleteError) throw deleteError

            setSuccess(true)
            setTimeout(() => {
                onUpdate()
                onClose()
            }, 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete appointment')
        } finally {
            setDeleting(false)
        }
    }

    // Check if user can delete appointments
    const canDeleteAppointment = () => {
        return isPractitioner(userRoleData?.role || null) && 
               hasPermission(userRoleData?.permissions || [], 'appointments', 'delete')
    }

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        return `${displayHour}:${minutes} ${ampm}`
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Modal */}
            <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto ${isClosing
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
                        Edit Appointment
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
                             <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                 {deleting ? 'Appointment Deleted!' : 'Appointment Updated!'}
                             </h3>
                             <p className="text-gray-600">
                                 {deleting ? 'The appointment has been successfully deleted.' : 'Your appointment has been successfully updated.'}
                             </p>
                         </div>
                     ) : showDeleteConfirm ? (
                         /* Delete Confirmation Content */
                         <div className="space-y-6">
                             <div className="text-center py-4">
                                 <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                     <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                     </svg>
                                 </div>
                                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Appointment</h3>
                                 <p className="text-gray-600 mb-4">
                                     Are you sure you want to delete this appointment? This action cannot be undone.
                                 </p>
                                 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                     <div className="flex">
                                         <div className="flex-shrink-0">
                                             <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                             </svg>
                                         </div>
                                         <div className="ml-3">
                                             <p className="text-sm text-red-800">
                                                 <strong>Warning:</strong> This will permanently delete the appointment.
                                             </p>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Current Appointment Info */}
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-gray-900 mb-2">Current Appointment</h4>
                                <p className="text-sm text-gray-600">
                                    {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Practitioner: {appointment.practitioner?.first_name} {appointment.practitioner?.last_name}
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
                                                className={`p-4 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
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
                                                        <p className="font-semibold text-gray-900">{formatPrice(service.price || 0)}</p>
                                                        <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Date</h4>
                                <DatePicker
                                    date={selectedDate}
                                    onDateChange={setSelectedDate}
                                    placeholder="Choose appointment date"
                                    className="w-full"
                                />
                            </div>

                            {/* Time Selection */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Time</h4>
                                {selectedDate && appointment?.practitioner && (
                                    <TimeSlotSelector
                                        selectedDate={selectedDate}
                                        practitionerId={appointment.practitioner_id}
                                        serviceDurationMinutes={selectedServices.reduce((total, service) => total + (service.duration_minutes || 0), 0)}
                                        existingAppointments={existingAppointments}
                                        onTimeSelect={setSelectedTimeSlot}
                                        selectedTime={selectedTimeSlot}
                                        disabled={loading}
                                    />
                                )}
                            </div>

                            {/* Cancellation Notice */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-800">
                                            <span className="font-medium">Need to cancel?</span> Contact {appointment.practitioner?.first_name} {appointment.practitioner?.last_name} at {appointment.practitioner?.phone || 'their contact number'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            {selectedServices.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                                    <div className="space-y-2">
                                        {selectedServices.map(service => (
                                            <div key={service.id} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{service.name}</span>
                                                <span className="text-gray-900">{formatPrice(service.price || 0)}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                                            <span>Total</span>
                                            <span>{formatPrice(getTotalPrice())}</span>
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
                             {showDeleteConfirm ? (
                                 /* Delete Confirmation Actions */
                                 <>
                                     <button
                                         type="button"
                                         onClick={() => setShowDeleteConfirm(false)}
                                         className="flex-1 bg-gray-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base"
                                     >
                                         Cancel
                                     </button>
                                     <button
                                         type="button"
                                         onClick={handleDeleteAppointment}
                                         disabled={deleting}
                                         className="flex-1 bg-red-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                                     >
                                         {deleting ? 'Deleting...' : 'Delete Appointment'}
                                     </button>
                                 </>
                             ) : (
                                 /* Edit Actions */
                                 <>
                                     <button
                                         type="button"
                                         onClick={onClose}
                                         className="flex-1 bg-gray-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base"
                                     >
                                         Cancel
                                     </button>
                                     {canDeleteAppointment() && (
                                         <button
                                             type="button"
                                             onClick={() => setShowDeleteConfirm(true)}
                                             className="flex-1 bg-red-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm lg:text-base"
                                         >
                                             Delete
                                         </button>
                                     )}
                                     <button
                                         type="submit"
                                         onClick={handleSubmit}
                                         disabled={loading || selectedServices.length === 0 || !selectedDate || !selectedTimeSlot}
                                         className="flex-1 bg-indigo-600 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                                     >
                                         {loading ? 'Updating...' : 'Update Appointment'}
                                     </button>
                                 </>
                             )}
                         </div>
                     </div>
                 )}
            </div>

        </div>
)}
