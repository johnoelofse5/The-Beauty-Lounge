import { supabase } from './supabase'

export class AppointmentSMSService {
  static async sendAppointmentNotifications(
    appointmentId: string, 
    smsType: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder' = 'confirmation',
    scheduleForMidnight: boolean = false,
    sendClientSMS: boolean = true
  ): Promise<{
    success: boolean
    message: string
    data?: {
      client_sms_sent: boolean
      practitioner_sms_sent: boolean
      scheduled?: boolean
      schedule_date?: string
    }
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-appointment-sms', {
        body: { 
          appointment_id: appointmentId,
          sms_type: smsType,
          schedule_for_midnight: scheduleForMidnight,
          send_client_sms: sendClientSMS
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

  static async sendRescheduleSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'reschedule')
  }

  static async sendCancellationSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'cancellation')
  }

  static async sendReminderSMS(appointmentId: string) {
    return this.sendAppointmentNotifications(appointmentId, 'reminder')
  }

  static async scheduleReminderSMS(appointmentId: string) {
    try {
      
      
      const { error } = await supabase
        .from('sms_logs')
        .insert({
          appointment_id: appointmentId,
          sms_type: 'reminder',
          client_sms_sent: false,
          practitioner_sms_sent: false,
          scheduled: true,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error logging reminder request:', error)
        return { success: false, message: 'Failed to schedule reminder' }
      }

      return { success: true, message: 'Reminder scheduled for daily processing' }
    } catch (error) {
      console.error('Error in scheduleReminderSMS:', error)
      return { success: false, message: 'Failed to schedule reminder' }
    }
  }

  static async cancelScheduledSMS(appointmentId: string, smsType: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder' = 'reminder') {
    try {
      
      const { error: updateError } = await supabase
        .from('sms_logs')
        .update({ 
          cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'appointment_modified'
        })
        .eq('appointment_id', appointmentId)
        .eq('sms_type', smsType)
        .eq('cancelled', false)

      if (updateError) {
        console.error('Error updating SMS log:', updateError)
        return { success: false, message: 'Failed to update SMS log' }
      }

      return { 
        success: true, 
        message: 'Scheduled SMS cancelled'
      }
    } catch (error) {
      console.error('Error in cancelScheduledSMS:', error)
      return { success: false, message: 'Failed to cancel scheduled SMS' }
    }
  }

  static async rescheduleSMS(appointmentId: string, smsType: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder' = 'reminder') {
    try {
      
      await this.cancelScheduledSMS(appointmentId, smsType)
      
      
      if (smsType === 'reminder') {
        return this.scheduleReminderSMS(appointmentId)
      } else {
        return this.sendAppointmentNotifications(appointmentId, smsType, false)
      }
    } catch (error) {
      console.error('Error in rescheduleSMS:', error)
      return { success: false, message: 'Failed to reschedule SMS' }
    }
  }
}
