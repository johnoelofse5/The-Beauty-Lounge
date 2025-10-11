'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ScheduleService } from '@/lib/schedule-service'
import { ScheduleFormData, DaySchedule } from '@/types/schedule'
import { ValidationInput, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { useToast } from '@/contexts/ToastContext'
import { isPractitioner } from '@/lib/rbac'
import { lookupServiceCached } from '@/lib/lookup-service-cached'
import { Lookup } from '@/types/lookup'

const DAYS_OF_WEEK = [
  { key: 'monday', name: 'Monday', dayOfWeek: 1 },
  { key: 'tuesday', name: 'Tuesday', dayOfWeek: 2 },
  { key: 'wednesday', name: 'Wednesday', dayOfWeek: 3 },
  { key: 'thursday', name: 'Thursday', dayOfWeek: 4 },
  { key: 'friday', name: 'Friday', dayOfWeek: 5 },
  { key: 'saturday', name: 'Saturday', dayOfWeek: 6 },
  { key: 'sunday', name: 'Sunday', dayOfWeek: 0 }
]

export default function ScheduleManagementPage() {
  const { user, userRoleData, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [scheduleData, setScheduleData] = useState<ScheduleFormData>(ScheduleService.getDefaultSchedule())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timeSlotIntervals, setTimeSlotIntervals] = useState<Lookup[]>([])
  const [hours, setHours] = useState<Lookup[]>([])
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  
  const isPractitionerUser = isPractitioner(userRoleData?.role || null)

  useEffect(() => {
    if (!authLoading && user && isPractitionerUser) {
      loadSchedule()
      loadTimeSlotIntervals()
      loadHours()
    }
  }, [authLoading, user, isPractitionerUser])

  
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
  }, [loading, scheduleData])

  const loadHours = async () => {
    try {
      const hoursData = await lookupServiceCached.getHours()
      setHours(hoursData)
    } catch (error) {
      console.error('Error loading hours:', error)
      
      const fallbackHours: Lookup[] = []
      for (let i = 0; i <= 23; i++) {
        const hourValue = i.toString().padStart(2, '0')
        let displayText = ''
        if (i === 0) {
          displayText = '12:00 AM (Midnight)'
        } else if (i < 12) {
          displayText = `${hourValue}:00 AM`
        } else if (i === 12) {
          displayText = '12:00 PM (Noon)'
        } else {
          displayText = `${(i - 12).toString().padStart(2, '0')}:00 PM`
        }
        
        fallbackHours.push({
          id: i.toString(),
          lookup_type_id: '1',
          value: hourValue,
          secondary_value: displayText,
          display_order: i + 1,
          is_active: true,
          is_deleted: false,
          created_at: '',
          updated_at: ''
        })
      }
      setHours(fallbackHours)
    }
  }

  const loadTimeSlotIntervals = async () => {
    try {
      const intervals = await lookupServiceCached.getTimeSlotIntervals()
      setTimeSlotIntervals(intervals)
    } catch (error) {
      console.error('Error loading time slot intervals:', error)
      
      setTimeSlotIntervals([
        { id: '1', lookup_type_id: '1', value: '15', secondary_value: '15 minutes', display_order: 1, is_active: true, is_deleted: false, created_at: '', updated_at: '' },
        { id: '2', lookup_type_id: '1', value: '30', secondary_value: '30 minutes', display_order: 2, is_active: true, is_deleted: false, created_at: '', updated_at: '' },
        { id: '3', lookup_type_id: '1', value: '45', secondary_value: '45 minutes', display_order: 3, is_active: true, is_deleted: false, created_at: '', updated_at: '' },
        { id: '4', lookup_type_id: '1', value: '60', secondary_value: '60 minutes', display_order: 4, is_active: true, is_deleted: false, created_at: '', updated_at: '' },
        { id: '5', lookup_type_id: '1', value: '90', secondary_value: '90 minutes', display_order: 5, is_active: true, is_deleted: false, created_at: '', updated_at: '' },
        { id: '6', lookup_type_id: '1', value: '120', secondary_value: '120 minutes', display_order: 6, is_active: true, is_deleted: false, created_at: '', updated_at: '' }
      ])
    }
  }

  const loadSchedule = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const workingSchedule = await ScheduleService.getPractitionerSchedule(user.id)
      
      
      const formData: ScheduleFormData = ScheduleService.getDefaultSchedule()
      
      workingSchedule.forEach(schedule => {
        const dayKey = DAYS_OF_WEEK.find(day => day.dayOfWeek === schedule.day_of_week)?.key as keyof ScheduleFormData
        if (dayKey) {
        formData[dayKey] = {
          day_of_week: schedule.day_of_week,
          day_name: DAYS_OF_WEEK.find(day => day.dayOfWeek === schedule.day_of_week)?.name || '',
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          time_slot_interval_minutes: schedule.time_slot_interval_minutes || 30,
          is_active: true
        }
        }
      })
      
      setScheduleData(formData)
    } catch (error) {
      console.error('Error loading schedule:', error)
      showError('Failed to load your working schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (dayKey: keyof ScheduleFormData) => {
    setScheduleData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        is_active: !prev[dayKey].is_active
      }
    }))
  }

  const handleTimeChange = (dayKey: keyof ScheduleFormData, field: 'start_time' | 'end_time', hourValue: string) => {
    
    const timeValue = `${hourValue}:00`
    
    setScheduleData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: timeValue
      }
    }))
  }

  const handleIntervalChange = (dayKey: keyof ScheduleFormData, value: number) => {
    setScheduleData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        time_slot_interval_minutes: value
      }
    }))
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      await ScheduleService.savePractitionerSchedule(user.id, scheduleData)
      showSuccess('Working schedule updated successfully!')
    } catch (error) {
      console.error('Error saving schedule:', error)
      showError('Failed to save your working schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setScheduleData(ScheduleService.getDefaultSchedule())
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isPractitionerUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only practitioners can manage their working schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-700 ease-out"
          data-animate-id="schedule-container"
          style={{
            opacity: visibleElements.has('schedule-container') ? 1 : 0,
            transform: visibleElements.has('schedule-container') ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Working Schedule Management</h1>
            <p className="text-gray-600 mt-1">
              Set your working hours for each day of the week. Clients will only be able to book appointments during these times.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {DAYS_OF_WEEK.map(({ key, name }, index) => {
              const dayData = scheduleData[key as keyof ScheduleFormData]
              
              return (
                <div 
                  key={key} 
                  className="border border-gray-200 rounded-lg p-4 transition-all duration-700 ease-out"
                  data-animate-id={`day-${key}`}
                  style={{
                    opacity: visibleElements.has(`day-${key}`) ? 1 : 0,
                    transform: visibleElements.has(`day-${key}`) ? 'translateY(0)' : 'translateY(30px)',
                    transition: `all 0.6s ease-out ${index * 0.1}s`
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`day-${key}`}
                        checked={dayData.is_active}
                        onChange={() => handleDayToggle(key as keyof ScheduleFormData)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`day-${key}`} className="text-lg font-medium text-gray-900">
                        {name}
                      </label>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      dayData.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dayData.is_active ? 'Working' : 'Closed'}
                    </span>
                  </div>

                  {dayData.is_active && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <ValidationSelect
                            label="Start Time"
                            value={dayData.start_time.split(':')[0]} 
                            onValueChange={(value) => handleTimeChange(key as keyof ScheduleFormData, 'start_time', value)}
                            placeholder="Select start time"
                          >
                            {hours.map((hour) => (
                              <SelectItem key={hour.id} value={hour.value}>
                                {hour.secondary_value || `${hour.value}:00`}
                              </SelectItem>
                            ))}
                          </ValidationSelect>
                        </div>
                        <div>
                          <ValidationSelect
                            label="End Time"
                            value={dayData.end_time.split(':')[0]} 
                            onValueChange={(value) => handleTimeChange(key as keyof ScheduleFormData, 'end_time', value)}
                            placeholder="Select end time"
                          >
                            {hours.map((hour) => (
                              <SelectItem key={hour.id} value={hour.value}>
                                {hour.secondary_value || `${hour.value}:00`}
                              </SelectItem>
                            ))}
                          </ValidationSelect>
                        </div>
                      </div>
                      
                        <div>
                          <ValidationSelect
                            label="Time Slot Interval"
                            value={dayData.time_slot_interval_minutes.toString()}
                            onValueChange={(value) => handleIntervalChange(key as keyof ScheduleFormData, parseInt(value))}
                            placeholder="Select interval"
                          >
                            {timeSlotIntervals.map((interval) => (
                              <SelectItem key={interval.id} value={interval.value}>
                                {interval.secondary_value || `${interval.value} minutes`}
                              </SelectItem>
                            ))}
                          </ValidationSelect>
                          <p className="text-xs text-gray-500 mt-1">
                            How often clients can book appointments (e.g., every 30 minutes)
                          </p>
                        </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div 
              className="flex items-center justify-between pt-6 border-t border-gray-200 transition-all duration-700 ease-out"
              data-animate-id="schedule-actions"
              style={{
                opacity: visibleElements.has('schedule-actions') ? 1 : 0,
                transform: visibleElements.has('schedule-actions') ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Reset to Default
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>

        {/* Help section */}
        <div 
          className="mt-8 bg-blue-50 rounded-lg p-6 transition-all duration-700 ease-out"
          data-animate-id="help-section"
          style={{
            opacity: visibleElements.has('help-section') ? 1 : 0,
            transform: visibleElements.has('help-section') ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <h3 className="text-lg font-medium text-blue-900 mb-2">How it works</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Check the box next to each day you want to work</li>
            <li>• Set your start and end times for each working day</li>
            <li>• Clients can only book appointments during your working hours</li>
            <li>• Time slots are generated based on your configured interval (15, 30, 45, 60, 90, or 120 minutes)</li>
            <li>• Changes take effect immediately after saving</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
