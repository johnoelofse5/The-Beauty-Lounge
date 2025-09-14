'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ScheduleService } from '@/lib/schedule-service'
import { ScheduleFormData, DaySchedule } from '@/types/schedule'
import { ValidationInput } from '@/components/validation/ValidationComponents'
import { useToast } from '@/contexts/ToastContext'
import { isPractitioner } from '@/lib/rbac'

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

  // Check if user is a practitioner
  const isPractitionerUser = isPractitioner(userRoleData?.role || null)

  useEffect(() => {
    if (!authLoading && user && isPractitionerUser) {
      loadSchedule()
    }
  }, [authLoading, user, isPractitionerUser])

  const loadSchedule = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const workingSchedule = await ScheduleService.getPractitionerSchedule(user.id)
      
      // Convert working schedule to form data
      const formData: ScheduleFormData = ScheduleService.getDefaultSchedule()
      
      workingSchedule.forEach(schedule => {
        const dayKey = DAYS_OF_WEEK.find(day => day.dayOfWeek === schedule.day_of_week)?.key as keyof ScheduleFormData
        if (dayKey) {
          formData[dayKey] = {
            day_of_week: schedule.day_of_week,
            day_name: DAYS_OF_WEEK.find(day => day.dayOfWeek === schedule.day_of_week)?.name || '',
            start_time: schedule.start_time,
            end_time: schedule.end_time,
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

  const handleTimeChange = (dayKey: keyof ScheduleFormData, field: 'start_time' | 'end_time', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isPractitionerUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only practitioners can manage their working schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Working Schedule Management</h1>
            <p className="text-gray-600 mt-1">
              Set your working hours for each day of the week. Clients will only be able to book appointments during these times.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {DAYS_OF_WEEK.map(({ key, name }) => {
              const dayData = scheduleData[key as keyof ScheduleFormData]
              
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <ValidationInput
                          type="time"
                          value={dayData.start_time}
                          onChange={(e) => handleTimeChange(key as keyof ScheduleFormData, 'start_time', e.target.value)}
                          className="w-full"
                          label="Start Time"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>
                        <ValidationInput
                          type="time"
                          value={dayData.end_time}
                          onChange={(e) => handleTimeChange(key as keyof ScheduleFormData, 'end_time', e.target.value)}
                          className="w-full"
                          label="End Time"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
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
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How it works</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Check the box next to each day you want to work</li>
            <li>• Set your start and end times for each working day</li>
            <li>• Clients can only book appointments during your working hours</li>
            <li>• Time slots are generated in 30-minute intervals</li>
            <li>• Changes take effect immediately after saving</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
