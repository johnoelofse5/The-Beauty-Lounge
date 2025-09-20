import { supabase } from './supabase'
import { CompletedAppointment } from '@/types'

export class AppointmentCompletionService {
  /**
   * Get appointments that need completion confirmation
   */
  static async getAppointmentsNeedingCompletion(): Promise<CompletedAppointment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase.rpc('get_appointments_needing_completion', {
        user_id_param: user.id
      })

      if (error) {
        console.error('Error fetching appointments needing completion:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAppointmentsNeedingCompletion:', error)
      throw error
    }
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) {
        console.error('Error updating appointment status:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateAppointmentStatus:', error)
      throw error
    }
  }

  /**
   * Mark appointment as completed
   */
  static async markAsCompleted(appointmentId: string): Promise<void> {
    return this.updateAppointmentStatus(appointmentId, 'completed')
  }

  /**
   * Mark appointment as cancelled
   */
  static async markAsCancelled(appointmentId: string): Promise<void> {
    return this.updateAppointmentStatus(appointmentId, 'cancelled')
  }

  /**
   * Format appointment date and time for display
   */
  static formatAppointmentDateTime(appointment: CompletedAppointment): string {
    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    const endTimeStr = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    return `${dateStr} from ${startTimeStr} to ${endTimeStr}`
  }

  /**
   * Format client name for display
   */
  static formatClientName(appointment: CompletedAppointment): string {
    if (appointment.client_first_name && appointment.client_last_name) {
      return `${appointment.client_first_name} ${appointment.client_last_name}`
    } else if (appointment.client_first_name) {
      return appointment.client_first_name
    } else if (appointment.client_email) {
      return appointment.client_email
    }
    return 'Unknown Client'
  }

  /**
   * Format services for display
   */
  static formatServices(appointment: CompletedAppointment): string {
    if (appointment.service_names && appointment.service_names.length > 0) {
      return appointment.service_names.join(', ')
    }
    return 'No services specified'
  }

  /**
   * Trigger manual completion check
   */
  static async triggerCompletionCheck(): Promise<{ success: boolean; message: string; updated_count: number; timestamp: string }> {
    try {
      const { data, error } = await supabase.rpc('trigger_completion_check')

      if (error) {
        console.error('Error triggering completion check:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in triggerCompletionCheck:', error)
      throw error
    }
  }

  /**
   * Get completion statistics
   */
  static async getCompletionStats(): Promise<{ total_completed: number; pending_confirmation: number; recent_completions: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase.rpc('get_completion_stats', {
        user_id_param: user.id
      })

      if (error) {
        console.error('Error fetching completion stats:', error)
        throw error
      }

      return data[0] || { total_completed: 0, pending_confirmation: 0, recent_completions: 0 }
    } catch (error) {
      console.error('Error in getCompletionStats:', error)
      throw error
    }
  }
}