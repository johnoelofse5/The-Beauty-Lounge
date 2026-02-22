'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { ServiceWithCategory } from '@/types'
import { formatDuration, getServicesWithCategories } from '@/lib/services'
import { AppointmentSMSService } from '@/lib/appointment-sms-service'
import { AppointmentCalendarService } from '@/lib/appointment-calendar-service'
import TimeSlotSelector from '@/components/TimeSlotSelector'
import { Practitioner } from '@/types/practitioner'
import { Client } from '@/types/client'
import { formatDateForAPI } from '../utils/appointment-formatters'

interface Props {
  selectedDate: Date
  isClosing: boolean
  onClose: () => void
  onUpdate: () => void
  userRoleData: any
}

export default function CreateAppointmentModal({
  selectedDate,
  isClosing,
  onClose,
  onUpdate,
  userRoleData
}: Props) {
  const { showSuccess, showError } = useToast()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([])
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isExternalClient, setIsExternalClient] = useState(false)
  const [externalClientInfo, setExternalClientInfo] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [existingAppointments, setExistingAppointments] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Load existing appointments for the selected practitioner/date
  const loadExistingAppointments = useCallback(async () => {
    if (!selectedDate || !selectedPractitioner) { setExistingAppointments([]); return }
    try {
      setLoadingSlots(true)
      setExistingAppointments([])
      const dateStr = formatDateForAPI(selectedDate)
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .gte('appointment_date', `${dateStr}T00:00:00`)
        .lt('appointment_date', `${dateStr}T23:59:59`)
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
          const self = practitionersData.data?.find(p => p.id === userRoleData.user?.id)
          if (self) setSelectedPractitioner(self)
        } else if (userRoleData?.role?.name === 'super_admin' && practitionersData.data?.length) {
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
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (selectedServices.length === 0) { showError('Please select at least one service'); return }
      if (!selectedPractitioner) { showError('Please select a practitioner'); return }
      if (!isExternalClient && !selectedClient) { showError('Please select a client or choose external client option'); return }
      if (isExternalClient && (!externalClientInfo.firstName || !externalClientInfo.lastName || !externalClientInfo.phone)) {
        showError('Please fill in all required external client details'); return
      }
      if (!selectedTimeSlot) { showError('Please select a time slot'); return }

      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number)
      const endMins = hours * 60 + minutes + totalDuration
      const endTimeString = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`

      const dateString = formatDateForAPI(selectedDate)
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

      const { data: inserted, error } = await supabase
        .from('appointments').insert([appointmentData]).select('id').single()
      if (error) { showError(error.message || 'Failed to create appointment'); return }

      try { await AppointmentSMSService.sendAppointmentNotifications(inserted.id, 'confirmation') }
      catch (err) { console.error('SMS error:', err) }
      try { await AppointmentCalendarService.createCalendarEvent(inserted.id) }
      catch (err) { console.error('Calendar error:', err) }

      showSuccess('Appointment created successfully!')
      setSuccess(true)
      setTimeout(() => { onUpdate(); onClose() }, 1500)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const isSubmitDisabled = loading || !selectedServices.length || !selectedPractitioner ||
    (!isExternalClient && !selectedClient) ||
    (isExternalClient && (!externalClientInfo.firstName || !externalClientInfo.lastName || !externalClientInfo.phone)) ||
    !selectedTimeSlot

  return (
    <div className="fixed inset-0 z-[60] pointer-events-auto">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col ${
          isClosing
            ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
            : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Appointment</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
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

              {/* Date display */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">Selected Date</h4>
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Services */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Services</h4>
                <div className="space-y-3">
                  {services.map(service => {
                    const selected = selectedServices.some(s => s.id === service.id)
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleServiceToggle(service)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                            }`}>
                              {selected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">{service.name}</h5>
                              {service.description && <p className="text-sm text-gray-600">{service.description}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">R{service.price ?? 0}</p>
                            <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Practitioner */}
              {userRoleData?.role?.name === 'super_admin' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Practitioner</h4>
                  <select
                    value={selectedPractitioner?.id ?? ''}
                    onChange={e => setSelectedPractitioner(practitioners.find(p => p.id === e.target.value) ?? null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choose a practitioner</option>
                    {practitioners.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {userRoleData?.role?.name === 'practitioner' && selectedPractitioner && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Practitioner</h4>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="text-gray-900">{selectedPractitioner.first_name} {selectedPractitioner.last_name}</p>
                  </div>
                </div>
              )}

              {/* Client */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Client</h4>
                <div className="flex space-x-4 mb-4">
                  {[false, true].map(ext => (
                    <label key={String(ext)} className="flex items-center">
                      <input
                        type="radio"
                        name="clientType"
                        checked={isExternalClient === ext}
                        onChange={() => setIsExternalClient(ext)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{ext ? 'New Client' : 'Existing Client'}</span>
                    </label>
                  ))}
                </div>

                {!isExternalClient ? (
                  <select
                    value={selectedClient?.id ?? ''}
                    onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) ?? null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choose a client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input type="text" value={externalClientInfo.firstName}
                          onChange={e => setExternalClientInfo(p => ({ ...p, firstName: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input type="text" value={externalClientInfo.lastName}
                          onChange={e => setExternalClientInfo(p => ({ ...p, lastName: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input type="tel" value={externalClientInfo.phone}
                        onChange={e => setExternalClientInfo(p => ({ ...p, phone: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                      <input type="email" value={externalClientInfo.email}
                        onChange={e => setExternalClientInfo(p => ({ ...p, email: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Time */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Time</h4>
                {loadingSlots ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                    <span className="ml-2 text-sm text-gray-600">Loading available times...</span>
                  </div>
                ) : selectedPractitioner ? (
                  <TimeSlotSelector
                    key={`${selectedDate.toISOString()}-${selectedPractitioner.id}`}
                    selectedDate={selectedDate}
                    practitionerId={selectedPractitioner.id}
                    serviceDurationMinutes={totalDuration}
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
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any special notes or requirements..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedServices.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                  <div className="space-y-2">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{s.name}</span>
                        <span className="text-gray-900">R{s.price ?? 0}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>R{totalPrice}</span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex space-x-3">
              <button type="button" onClick={onClose}
                className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base">
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} disabled={isSubmitDisabled}
                className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base">
                {loading ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}