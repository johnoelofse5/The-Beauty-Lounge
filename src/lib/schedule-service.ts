import { supabase } from '@/lib/supabase'
import { WorkingSchedule, DaySchedule, ScheduleFormData } from '@/types/schedule'
import { LookupService } from '@/lib/lookup-service'

export class ScheduleService {
  
  static async getPractitionerSchedule(practitionerId: string): Promise<WorkingSchedule[]> {
    const { data, error } = await supabase
      .from('working_schedule')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching practitioner schedule:', error)
      throw new Error('Failed to fetch schedule')
    }

    return data || []
  }

  
  static async savePractitionerSchedule(practitionerId: string, scheduleData: ScheduleFormData): Promise<void> {
    try {
      
      const { error: deleteError } = await supabase
        .from('working_schedule')
        .update({ is_deleted: true, is_active: false })
        .eq('practitioner_id', practitionerId)
        .eq('is_deleted', false)

      if (deleteError) {
        console.error('Error deleting existing schedule:', deleteError)
        throw new Error('Failed to delete existing schedule')
      }

      
      const daysOfWeek = await LookupService.getDaysOfWeek()
      
      
      const scheduleEntries: Omit<WorkingSchedule, 'id' | 'created_at' | 'updated_at'>[] = []
      
      
      const dayKeyMap: Record<string, keyof ScheduleFormData> = {
        '1': 'monday',
        '2': 'tuesday', 
        '3': 'wednesday',
        '4': 'thursday',
        '5': 'friday',
        '6': 'saturday',
        '7': 'sunday'
      }

      daysOfWeek.forEach((dayLookup) => {
        const dayOfWeek = parseInt(dayLookup.value) - 1 
        const dayKey = dayKeyMap[dayLookup.value] as keyof ScheduleFormData
        
        if (dayKey && scheduleData[dayKey]) {
          const daySchedule = scheduleData[dayKey]
          if (daySchedule.is_active) {
            
            if (daySchedule.start_time >= daySchedule.end_time) {
              throw new Error(`Invalid time range for ${daySchedule.day_name}: start time must be before end time`)
            }
            
            scheduleEntries.push({
              practitioner_id: practitionerId,
              day_of_week: dayOfWeek,
              start_time: daySchedule.start_time,
              end_time: daySchedule.end_time,
              time_slot_interval_minutes: daySchedule.time_slot_interval_minutes || 30,
              is_active: true,
              is_deleted: false
            })
          }
        }
      })

      
      if (scheduleEntries.length > 0) {
        const { error } = await supabase
          .from('working_schedule')
          .insert(scheduleEntries)

        if (error) {
          console.error('Error saving schedule:', error)
          throw new Error('Failed to save schedule')
        }
      }
    } catch (error) {
      console.error('Error in savePractitionerSchedule:', error)
      throw error
    }
  }

  
  static async getWorkingHoursForDay(practitionerId: string, dayOfWeek: number): Promise<WorkingSchedule[]> {
    const { data, error } = await supabase
      .from('working_schedule')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching working hours for day:', error)
      throw new Error('Failed to fetch working hours')
    }

    return data || []
  }

  
  static generateTimeSlots(
    workingSchedules: WorkingSchedule[],
    selectedDate: Date,
    existingAppointments: any[] = [],
    serviceDurationMinutes: number = 30
  ): { time: string; available: boolean; is_working_hours: boolean }[] {
    const dayOfWeek = selectedDate.getDay()
    const daySchedule = workingSchedules.find(schedule => schedule.day_of_week === dayOfWeek)
    
    
    if (!daySchedule) {
      return [] 
    }

    const slots: { time: string; available: boolean; is_working_hours: boolean }[] = []
    const startHour = parseInt(daySchedule.start_time.split(':')[0])
    const startMinute = parseInt(daySchedule.start_time.split(':')[1])
    const endHour = parseInt(daySchedule.end_time.split(':')[0])
    const endMinute = parseInt(daySchedule.end_time.split(':')[1])
    
    const intervalMinutes = daySchedule.time_slot_interval_minutes || 30
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        
        if (hour === endHour && minute >= endMinute) {
          break
        }

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
        
        
        
        const startTimeMinutes = hour * 60 + minute
        const endTimeMinutes = startTimeMinutes + serviceDurationMinutes
        const endHours = Math.floor(endTimeMinutes / 60)
        const endMins = endTimeMinutes % 60
        const endTimeString = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
        
        
        const hasConflict = existingAppointments?.some(apt => {
          
          if (apt.start_time && apt.start_time.includes('T')) {
            
            const aptStartTimeUTC = new Date(apt.start_time)
            const aptEndTimeUTC = new Date(apt.end_time)
            
            
            const aptStartHour = aptStartTimeUTC.getHours()
            const aptStartMinute = aptStartTimeUTC.getMinutes()
            const aptEndHour = aptEndTimeUTC.getHours()
            const aptEndMinute = aptEndTimeUTC.getMinutes()
            
            
            const aptStartTimeString = `${aptStartHour.toString().padStart(2, '0')}:${aptStartMinute.toString().padStart(2, '0')}:00`
            const aptEndTimeString = `${aptEndHour.toString().padStart(2, '0')}:${aptEndMinute.toString().padStart(2, '0')}:00`
            
            
            
            const conflicts = (timeString < aptEndTimeString && endTimeString > aptStartTimeString)
            return conflicts
          }
          
          const aptStart = apt.start_time
          const aptEnd = apt.end_time
          return (timeString < aptEnd && endTimeString > aptStart)
        })

        slots.push({
          time: timeString,
          available: !hasConflict,
          is_working_hours: true 
        })
      }
    }

    return slots
  }

  
  static getDefaultSchedule(): ScheduleFormData {
    return {
      monday: { day_of_week: 1, day_name: 'Monday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: true },
      tuesday: { day_of_week: 2, day_name: 'Tuesday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: true },
      wednesday: { day_of_week: 3, day_name: 'Wednesday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: true },
      thursday: { day_of_week: 4, day_name: 'Thursday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: true },
      friday: { day_of_week: 5, day_name: 'Friday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: true },
      saturday: { day_of_week: 6, day_name: 'Saturday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: false },
      sunday: { day_of_week: 0, day_name: 'Sunday', start_time: '08:00:00', end_time: '19:00:00', time_slot_interval_minutes: 30, is_active: false }
    }
  }

  private static formatDateLocal(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private static getTodayLocal(): string {
    const today = new Date()
    return this.formatDateLocal(today)
  }
  
  static async getBlockedDates(practitionerId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('blocked_date')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .gte('blocked_date', ScheduleService.getTodayLocal())
      .order('blocked_date', { ascending: true })

    if (error) {
      console.error('Error fetching blocked dates:', error)
      throw new Error('Failed to fetch blocked dates')
    }

    return (data || []).map(item => item.blocked_date)
  }

  static async isDateBlocked(practitionerId: string, date: Date): Promise<boolean> {
    const dateString = ScheduleService.formatDateLocal(date)
    
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('practitioner_id', practitionerId)
      .eq('blocked_date', dateString)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1)

    if (error) {
      console.error('Error checking blocked date:', error)
      return false
    }

    return (data || []).length > 0
  }

  static async addBlockedDate(practitionerId: string, date: Date, reason?: string): Promise<void> {
    const localDate = new Date(date)
    localDate.setHours(0, 0, 0, 0)
    const dateString = ScheduleService.formatDateLocal(localDate)
    
    const { data: existingData, error: checkError } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('practitioner_id', practitionerId)
      .eq('blocked_date', dateString)
      .limit(1)
      .maybeSingle()
    
    const existing = existingData

    if (existing) {
      const { error } = await supabase
        .from('blocked_dates')
        .update({
          reason: reason || null,
          is_active: true,
          is_deleted: false
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating blocked date:', error)
        throw new Error('Failed to add blocked date')
      }
    } else {
      const { error } = await supabase
        .from('blocked_dates')
        .insert({
          practitioner_id: practitionerId,
          blocked_date: dateString,
          reason: reason || null,
          is_active: true,
          is_deleted: false
        })

      if (error) {
        console.error('Error adding blocked date:', error)
        throw new Error('Failed to add blocked date')
      }
    }
  }

  static async removeBlockedDate(practitionerId: string, date: Date): Promise<void> {
    const localDate = new Date(date)
    localDate.setHours(0, 0, 0, 0)
    const dateString = ScheduleService.formatDateLocal(localDate)
    
    const { data: functionResult, error: functionError } = await supabase
      .rpc('soft_delete_blocked_date', {
        p_practitioner_id: practitionerId,
        p_blocked_date: dateString
      })

    if (!functionError && functionResult === true) {
      return
    }

    if (functionError && functionError.code === '42883') {
      const { data, error } = await supabase
        .from('blocked_dates')
        .update({ is_deleted: true, is_active: false })
        .eq('practitioner_id', practitionerId)
        .eq('blocked_date', dateString)
        .eq('is_deleted', false)
        .select()

      if (error) {
        console.error('Error removing blocked date:', error)
        throw new Error(`Failed to remove blocked date: ${error.message || 'Unknown error'}`)
      }

      if (!data || data.length === 0) {
        console.warn(`No blocked date found to remove for date: ${dateString}`)
      }
    } else if (functionError) {
      console.error('Error calling soft_delete_blocked_date function:', functionError)
      throw new Error(`Failed to remove blocked date: ${functionError.message || 'Unknown error'}`)
    } else if (functionResult === false) {
      console.warn(`No blocked date found to remove for date: ${dateString}`)
    }
  }

  static async getBlockedDatesWithDetails(practitionerId: string): Promise<Array<{ id: string; blocked_date: string; reason: string | null }>> {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id, blocked_date, reason')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .gte('blocked_date', ScheduleService.getTodayLocal())
      .order('blocked_date', { ascending: true })

    if (error) {
      console.error('Error fetching blocked dates with details:', error)
      throw new Error('Failed to fetch blocked dates')
    }

    return (data || []).map(item => ({
      id: item.id,
      blocked_date: item.blocked_date,
      reason: item.reason
    }))
  }
}
