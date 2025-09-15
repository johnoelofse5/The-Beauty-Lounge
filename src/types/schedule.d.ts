export interface WorkingSchedule {
  id: string
  practitioner_id: string
  day_of_week: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string // HH:MM:SS format
  end_time: string // HH:MM:SS format
  time_slot_interval_minutes: number // Time slot interval in minutes (15, 30, 45, 60, etc.)
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DaySchedule {
  day_of_week: number
  day_name: string
  start_time: string
  end_time: string
  time_slot_interval_minutes: number
  is_active: boolean
}

export interface TimeSlot {
  time: string // HH:MM:SS format
  available: boolean
  is_working_hours: boolean
}

export interface ScheduleFormData {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}
