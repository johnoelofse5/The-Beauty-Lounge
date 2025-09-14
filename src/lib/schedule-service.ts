import { supabase } from '@/lib/supabase'
import { WorkingSchedule, DaySchedule, ScheduleFormData } from '@/types/schedule'

export class ScheduleService {
  // Get working schedule for a practitioner
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

  // Save working schedule for a practitioner
  static async savePractitionerSchedule(practitionerId: string, scheduleData: ScheduleFormData): Promise<void> {
    try {
      // First, soft delete existing schedule
      await supabase
        .from('working_schedule')
        .update({ is_deleted: true })
        .eq('practitioner_id', practitionerId)
        .eq('is_active', true)

      // Prepare new schedule entries
      const scheduleEntries: Omit<WorkingSchedule, 'id' | 'created_at' | 'updated_at'>[] = []
      
      const days = [
        { key: 'sunday', dayOfWeek: 0 },
        { key: 'monday', dayOfWeek: 1 },
        { key: 'tuesday', dayOfWeek: 2 },
        { key: 'wednesday', dayOfWeek: 3 },
        { key: 'thursday', dayOfWeek: 4 },
        { key: 'friday', dayOfWeek: 5 },
        { key: 'saturday', dayOfWeek: 6 }
      ]

      days.forEach(({ key, dayOfWeek }) => {
        const daySchedule = scheduleData[key as keyof ScheduleFormData]
        if (daySchedule.is_active) {
          // Validate time order
          if (daySchedule.start_time >= daySchedule.end_time) {
            throw new Error(`Invalid time range for ${daySchedule.day_name}: start time must be before end time`)
          }
          
          scheduleEntries.push({
            practitioner_id: practitionerId,
            day_of_week: dayOfWeek,
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            is_active: true,
            is_deleted: false
          })
        }
      })

      // Insert new schedule entries
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

  // Get working hours for a specific day
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

  // Generate time slots based on working schedule
  static generateTimeSlots(
    workingSchedules: WorkingSchedule[],
    selectedDate: Date,
    existingAppointments: any[] = [],
    serviceDurationMinutes: number = 30
  ): { time: string; available: boolean; is_working_hours: boolean }[] {
    const dayOfWeek = selectedDate.getDay()
    const daySchedule = workingSchedules.find(schedule => schedule.day_of_week === dayOfWeek)
    
    // If no working schedule exists for this day, return empty array
    if (!daySchedule) {
      return [] // No working hours for this day
    }

    const slots: { time: string; available: boolean; is_working_hours: boolean }[] = []
    const startHour = parseInt(daySchedule.start_time.split(':')[0])
    const startMinute = parseInt(daySchedule.start_time.split(':')[1])
    const endHour = parseInt(daySchedule.end_time.split(':')[0])
    const endMinute = parseInt(daySchedule.end_time.split(':')[1])
    
    const intervalMinutes = 30

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        // Skip if this slot is after the end time
        if (hour === endHour && minute >= endMinute) {
          break
        }

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
        
        // Calculate end time for this slot with service duration
        const startTime = new Date(`${this.formatDateForAPI(selectedDate)}T${timeString}`)
        const endTime = new Date(startTime.getTime() + serviceDurationMinutes * 60000)
        const endTimeString = endTime.toTimeString().split(' ')[0]
        
        // Check if this slot conflicts with existing appointments
        const hasConflict = existingAppointments?.some(apt => {
          const aptStart = apt.start_time
          const aptEnd = apt.end_time
          return (timeString < aptEnd && endTimeString > aptStart)
        })

        slots.push({
          time: timeString,
          available: !hasConflict,
          is_working_hours: true // All slots within working hours are considered working hours
        })
      }
    }

    return slots
  }

  // Helper function to format date for API
  private static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  // Get default schedule (8 AM to 7 PM, Monday to Friday)
  static getDefaultSchedule(): ScheduleFormData {
    return {
      monday: { day_of_week: 1, day_name: 'Monday', start_time: '08:00:00', end_time: '19:00:00', is_active: true },
      tuesday: { day_of_week: 2, day_name: 'Tuesday', start_time: '08:00:00', end_time: '19:00:00', is_active: true },
      wednesday: { day_of_week: 3, day_name: 'Wednesday', start_time: '08:00:00', end_time: '19:00:00', is_active: true },
      thursday: { day_of_week: 4, day_name: 'Thursday', start_time: '08:00:00', end_time: '19:00:00', is_active: true },
      friday: { day_of_week: 5, day_name: 'Friday', start_time: '08:00:00', end_time: '19:00:00', is_active: true },
      saturday: { day_of_week: 6, day_name: 'Saturday', start_time: '08:00:00', end_time: '19:00:00', is_active: false },
      sunday: { day_of_week: 0, day_name: 'Sunday', start_time: '08:00:00', end_time: '19:00:00', is_active: false }
    }
  }
}
