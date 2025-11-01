'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ScheduleService } from '@/lib/schedule-service'
import { DatePicker } from '@/components/date-picker'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { isPractitioner, canManageSchedule } from '@/lib/rbac'

export default function BlockedDatesPage() {
  const { user, userRoleData, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const [hasPermission, setHasPermission] = useState(false)
  const [checkingPermission, setCheckingPermission] = useState(true)
  const [blockedDates, setBlockedDates] = useState<Array<{ id: string; blocked_date: string; reason: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id || authLoading) {
        setCheckingPermission(true)
        return
      }

      try {
        const isPractitionerUser = isPractitioner(userRoleData?.role || null)
        
        if (!isPractitionerUser) {
          showError('You do not have permission to access this page')
          router.push('/')
          return
        }

        const canManage = await canManageSchedule(user.id)
        
        if (!canManage) {
          showError('You do not have permission to manage blocked dates')
          router.push('/')
          return
        }

        setHasPermission(true)
      } catch (error) {
        console.error('Error checking permissions:', error)
        showError('Error checking permissions')
        router.push('/')
      } finally {
        setCheckingPermission(false)
      }
    }

    checkPermissions()
  }, [user?.id, userRoleData?.role, authLoading, router, showError])

  const loadBlockedDates = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const dates = await ScheduleService.getBlockedDatesWithDetails(user.id)
      setBlockedDates(dates)
    } catch (error) {
      console.error('Error loading blocked dates:', error)
      showError('Failed to load blocked dates')
    } finally {
      setLoading(false)
    }
  }, [user?.id, showError])

  useEffect(() => {
    if (hasPermission && user?.id) {
      loadBlockedDates()
    }
  }, [hasPermission, user?.id, loadBlockedDates])

  const handleAddBlockedDate = async () => {
    if (!user?.id) {
      showError('Please log in to block dates')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isMultiDay) {

      if (!fromDate || !toDate) {
        showError('Please select both from and to dates')
        return
      }

      if (fromDate > toDate) {
        showError('From date must be before or equal to to date')
        return
      }

      if (fromDate < today) {
        showError('Cannot block dates in the past')
        return
      }

      try {
        setAdding(true)
        
        const datesToBlock: Date[] = []
        const startDate = new Date(fromDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(toDate)
        endDate.setHours(0, 0, 0, 0)
        
        const timeDiff = endDate.getTime() - startDate.getTime()
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1
        
        for (let i = 0; i < daysDiff; i++) {
          const dateToAdd = new Date(startDate)
          dateToAdd.setDate(startDate.getDate() + i)
          dateToAdd.setHours(0, 0, 0, 0)
          datesToBlock.push(dateToAdd)
        }

        let successCount = 0
        let errorCount = 0

        for (const date of datesToBlock) {
          try {
            await ScheduleService.addBlockedDate(user.id, date, reason || undefined)
            successCount++
          } catch (error) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            console.error(`Error blocking date ${year}-${month}-${day}:`, error)
            errorCount++
          }
        }

        if (successCount > 0) {
          showSuccess(`Successfully blocked ${successCount} date${successCount > 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`)
        } else {
          showError('Failed to block dates')
        }

        setFromDate(undefined)
        setToDate(undefined)
        setReason('')
        loadBlockedDates()
      } catch (error) {
        console.error('Error adding blocked dates:', error)
        showError('Failed to block dates')
      } finally {
        setAdding(false)
      }
    } else {
      if (!selectedDate) {
        showError('Please select a date')
        return
      }

      const normalizedSelectedDate = new Date(selectedDate)
      normalizedSelectedDate.setHours(0, 0, 0, 0)
      
      if (normalizedSelectedDate < today) {
        showError('Cannot block dates in the past')
        return
      }

      try {
        setAdding(true)
        await ScheduleService.addBlockedDate(user.id, normalizedSelectedDate, reason || undefined)
        showSuccess('Date blocked successfully')
        setSelectedDate(undefined)
        setReason('')
        loadBlockedDates()
      } catch (error) {
        console.error('Error adding blocked date:', error)
        showError('Failed to block date')
      } finally {
        setAdding(false)
      }
    }
  }

  const handleRemoveBlockedDate = async (date: Date) => {
    if (!user?.id) return

    try {
      await ScheduleService.removeBlockedDate(user.id, date)
      showSuccess('Date unblocked successfully')
      loadBlockedDates()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error removing blocked date:', errorMessage, error)
      showError(errorMessage || 'Failed to unblock date')
    }
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 12)
    return maxDate
  }

  if (authLoading || checkingPermission || !hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Blocked Dates</h1>
            <p className="mt-2 text-sm text-gray-600">
              Block specific dates to prevent clients from booking appointments on those days. This is useful for holidays, time off, or other personal commitments.
            </p>
          </div>

          {/* Add Blocked Date Form */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Block a Date</h2>
            <div className="space-y-4">
              {/* Multi-day toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="multiDay"
                  checked={isMultiDay}
                  onChange={(e) => {
                    setIsMultiDay(e.target.checked)
                    // Clear dates when switching modes
                    setSelectedDate(undefined)
                    setFromDate(undefined)
                    setToDate(undefined)
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="multiDay" className="ml-2 block text-sm font-medium text-gray-700">
                  Block multiple days (date range)
                </label>
              </div>

              {/* Single Date Selector */}
              {!isMultiDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <DatePicker
                    date={selectedDate}
                    onDateChange={setSelectedDate}
                    placeholder="Pick a date to block"
                    minDate={new Date()}
                    maxDate={getMaxDate()}
                    allowSameDay={true}
                    className="w-full max-w-sm"
                  />
                </div>
              )}

              {/* Multi-day Date Range Selectors */}
              {isMultiDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <DatePicker
                      date={fromDate}
                      onDateChange={setFromDate}
                      placeholder="Pick start date"
                      minDate={new Date()}
                      maxDate={toDate || getMaxDate()}
                      allowSameDay={true}
                      className="w-full max-w-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <DatePicker
                      date={toDate}
                      onDateChange={setToDate}
                      placeholder="Pick end date"
                      minDate={fromDate || new Date()}
                      maxDate={getMaxDate()}
                      allowSameDay={true}
                      className="w-full max-w-sm"
                    />
                  </div>
                  {fromDate && toDate && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">
                        This will block {Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day{Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 !== 1 ? 's' : ''} from {fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reason field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Holiday, Time off, Personal appointment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleAddBlockedDate}
                disabled={
                  adding ||
                  (!isMultiDay && !selectedDate) ||
                  (isMultiDay && (!fromDate || !toDate))
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : isMultiDay ? 'Block Date Range' : 'Block Date'}
              </button>
            </div>
          </div>

          {/* Blocked Dates List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Blocked Dates</h2>
            {blockedDates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No dates are currently blocked</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedDates.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-medium text-gray-900">
                          {format(new Date(item.blocked_date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        {item.reason && (
                          <div className="text-sm text-gray-600">
                            ({item.reason})
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBlockedDate(new Date(item.blocked_date))}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
