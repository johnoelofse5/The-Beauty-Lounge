'use client'

import { useState, useEffect } from 'react'
import { TimeSlot, WorkingSchedule, TimeSlotSelectorProps } from '@/types'
import { ScheduleService } from '@/lib/schedule-service'
import { supabase } from '@/lib/supabase'

export default function TimeSlotSelector({
  selectedDate,
  practitionerId,
  serviceDurationMinutes,
  existingAppointments,
  onTimeSelect,
  selectedTime,
  disabled = false
}: TimeSlotSelectorProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [workingSchedule, setWorkingSchedule] = useState<WorkingSchedule[]>([])
  const [currentAppointments, setCurrentAppointments] = useState<any[]>([])

  // Load working schedule for the practitioner
  useEffect(() => {
    const loadWorkingSchedule = async () => {
      if (!practitionerId) return

      try {
        setLoading(true)
        const schedule = await ScheduleService.getPractitionerSchedule(practitionerId)
        setWorkingSchedule(schedule)
      } catch (error) {
        console.error('Error loading working schedule:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkingSchedule()
  }, [practitionerId])

  // Load appointments for the selected date
  useEffect(() => {
    const loadAppointments = async () => {
      if (!selectedDate || !practitionerId) {
        setCurrentAppointments([])
        return
      }

      try {
        // Use local date string to avoid timezone issues
        const selectedDateStr = selectedDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
        
        const { data, error } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .gte('appointment_date', `${selectedDateStr}T00:00:00`)
          .lt('appointment_date', `${selectedDateStr}T23:59:59`)
          .eq('practitioner_id', practitionerId)
          .eq('is_active', true)
          .eq('is_deleted', false)

        if (error) throw error
        setCurrentAppointments(data || [])
      } catch (err) {
        console.error('Error loading appointments in TimeSlotSelector:', err)
        setCurrentAppointments([])
      }
    }

    loadAppointments()
  }, [selectedDate?.toLocaleDateString('en-CA'), practitionerId])

  // Generate time slots when date, schedule, or appointments change
  useEffect(() => {
    
    if (!selectedDate || workingSchedule.length === 0) {
      setTimeSlots([])
      return
    }

    // Clear time slots first to prevent stale data
    setTimeSlots([])

    try {
      const slots = ScheduleService.generateTimeSlots(
        workingSchedule,
        selectedDate,
        currentAppointments,
        serviceDurationMinutes
      )
      setTimeSlots(slots)
    } catch (error) {
      console.error('Error generating time slots:', error)
      setTimeSlots([])
    }
  }, [selectedDate?.toLocaleDateString('en-CA'), workingSchedule, currentAppointments, serviceDurationMinutes])

  const formatTimeDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!selectedDate) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
        <p className="text-gray-500 text-center py-8">Please select a date to view available time slots</p>
      </div>
    )
  }

  if (timeSlots.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No working hours scheduled for this day</p>
          <p className="text-sm text-gray-400">
            {workingSchedule.length === 0 
              ? 'This practitioner needs to set up their working schedule first'
              : `No availability set for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}`
            }
          </p>
        </div>
      </div>
    )
  }

  const availableSlots = timeSlots.filter(slot => slot.available)
  const unavailableSlots = timeSlots.filter(slot => !slot.available)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
        <div className="text-sm text-gray-500">
          {availableSlots.length} of {timeSlots.length} slots available
        </div>
      </div>

      {/* Show message when no working schedule exists */}
      {workingSchedule.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">No working schedule set:</span> This practitioner hasn't configured their working hours yet.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Please ask them to set up their working schedule in the <a href="/schedule" className="underline hover:no-underline">Working Schedule</a> page
          </p>
        </div>
      )}

      {/* Available slots */}
      {availableSlots.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => onTimeSelect(slot.time)}
                disabled={disabled}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md border transition-colors
                  ${selectedTime === slot.time
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {formatTimeDisplay(slot.time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unavailable slots (for reference) */}
      {unavailableSlots.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {unavailableSlots.map((slot) => (
              <div
                key={slot.time}
                className="px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                {formatTimeDisplay(slot.time)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}
