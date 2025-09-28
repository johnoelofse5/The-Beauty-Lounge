import { supabase } from './supabase'

export class AppointmentSMSService {
  /**
   * Send SMS notifications for an appointment
   * @param appointmentId - The ID of the appointment
   * @param smsType - The type of SMS to send (confirmation, reschedule, cancellation, reminder)
   */
  static async sendAppointmentNotifications(
    appointmentId: string, 
    smsType: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder' = 'confirmation'
  ): Promise<{
    success: boolean
    message: string
    data?: {
      client_sms_sent: boolean
      practitioner_sms_sent: boolean
    }
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-appointment-sms', {
        body: { 
          appointment_id: appointmentId,
          sms_type: smsType
        }
      })

      if (error) {
        console.error('Error calling send-appointment-sms function:', error)
        return {
          success: false,
          message: 'Failed to send SMS notifications'
        }
      }

      return {
        success: data.success,
        message: data.message,
        data: data.data
      }
    } catch (error) {
      console.error('Error in AppointmentSMSService:', error)
      return {
        success: false,
        message: 'Failed to send SMS notifications'
      }
    }
  }

  /**
   * Get SMS logs for an appointment
   * @param appointmentId - The ID of the appointment
   */
  static async getSMSLogs(appointmentId: string) {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching SMS logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSMSLogs:', error)
      return []
    }
  }

  /**
   * Check if SMS has been sent for a specific appointment and type
   * @param appointmentId - The ID of the appointment
   * @param smsType - The type of SMS to check
   */
  static async hasSMSSent(appointmentId: string, smsType: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('sms_type', smsType)
        .limit(1)

      if (error) {
        console.error('Error checking SMS status:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('Error in hasSMSSent:', error)
      return false
    }
  }

  /**
   * Send reschedule SMS for an appointment
   * @param appointmentId - The ID of the appointment
   */
  static async sendRescheduleSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'reschedule')
  }

  /**
   * Send cancellation SMS for an appointment
   * @param appointmentId - The ID of the appointment
   */
  static async sendCancellationSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'cancellation')
  }

  /**
   * Send reminder SMS for an appointment
   * @param appointmentId - The ID of the appointment
   */
  static async sendReminderSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'reminder')
  }
}
