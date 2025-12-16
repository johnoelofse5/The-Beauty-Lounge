import { supabase } from './supabase'

export class AppointmentCalendarService {
  static async createCalendarEvent(
    appointmentId: string
  ): Promise<{
    success: boolean
    message: string
    data?: {
      event_id?: string
      calendar_url?: string
    }
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-google-calendar-event', {
        body: { 
          appointment_id: appointmentId
        }
      })

      if (error) {
        console.error('Error calling create-google-calendar-event function:', error)
        return {
          success: false,
          message: 'Failed to create Google Calendar event'
        }
      }

      return {
        success: data.success,
        message: data.message,
        data: data.data
      }
    } catch (error) {
      console.error('Error in AppointmentCalendarService:', error)
      return {
        success: false,
        message: 'Failed to create Google Calendar event'
      }
    }
  }

  static async updateCalendarEvent(
    appointmentId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('update-google-calendar-event', {
        body: { 
          appointment_id: appointmentId
        }
      })

      if (error) {
        console.error('Error calling update-google-calendar-event function:', error)
        return {
          success: false,
          message: 'Failed to update Google Calendar event'
        }
      }

      return {
        success: data.success,
        message: data.message
      }
    } catch (error) {
      console.error('Error in AppointmentCalendarService:', error)
      return {
        success: false,
        message: 'Failed to update Google Calendar event'
      }
    }
  }

  static async deleteCalendarEvent(
    appointmentId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('delete-google-calendar-event', {
        body: { 
          appointment_id: appointmentId
        }
      })

      if (error) {
        console.error('Error calling delete-google-calendar-event function:', error)
        return {
          success: false,
          message: 'Failed to delete Google Calendar event'
        }
      }

      return {
        success: data.success,
        message: data.message
      }
    } catch (error) {
      console.error('Error in AppointmentCalendarService:', error)
      return {
        success: false,
        message: 'Failed to delete Google Calendar event'
      }
    }
  }
}

