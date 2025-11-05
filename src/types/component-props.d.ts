import { AppointmentExtended } from './appointment-extended'
import { UserRoleData } from './role'

export interface EditAppointmentModalProps {
  appointment: AppointmentExtended
  isClosing: boolean
  onClose: () => void
  onUpdate: () => void
  userRoleData: UserRoleData
}

export interface AppointmentCompletionNotificationProps {
  onClose?: () => void
}

export interface TimeSlotSelectorProps {
  selectedDate: Date | undefined
  practitionerId: string
  serviceDurationMinutes: number
  existingAppointments: any[]
  onTimeSelect: (time: string) => void
  selectedTime: string
  disabled?: boolean
}

export interface SidebarNavProps {
  title?: string
}

export interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  allowSameDay?: boolean
  allowPastDates?: boolean
  blockedDates?: string[]
}
