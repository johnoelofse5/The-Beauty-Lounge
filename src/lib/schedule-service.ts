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
}
