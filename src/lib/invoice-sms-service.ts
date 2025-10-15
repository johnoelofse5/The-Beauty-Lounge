import { supabase } from './supabase'

export class InvoiceSMSService {
  static async sendInvoiceSMS(appointmentId: string, currentUserId?: string): Promise<{
    success: boolean
    message: string
    data?: {
      invoice_id: string
      invoice_number: string
      sms_sent: boolean
    }
  }> {
    try {
      const generatePayload = { appointment_id: appointmentId, current_user_id: currentUserId }
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: generatePayload
      })

      if (invoiceError) {
        return {
          success: false,
          message: 'Failed to generate invoice'
        }
      }

      if (!invoiceData.success) {
        return {
          success: false,
          message: invoiceData.message || 'Failed to generate invoice'
        }
      }

      const smsPayload = { appointment_id: appointmentId, current_user_id: currentUserId }
      const { data: smsData, error: smsError } = await supabase.functions.invoke('send-invoice-sms', {
        body: smsPayload
      })

      if (smsError) {
        return {
          success: false,
          message: 'Failed to send invoice SMS'
        }
      }

      return {
        success: smsData.success,
        message: smsData.message,
        data: smsData.data
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send invoice SMS'
      }
    }
  }

  static async getInvoiceStatus(appointmentId: string): Promise<{
    success: boolean
    data?: {
      invoice_exists: boolean
      invoice_id?: string
      status?: string
      sms_sent?: boolean
      sms_sent_at?: string
      sms_error?: string
    }
  }> {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, status, sms_sent, sms_sent_at, sms_error')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check invoice status: ${error.message}`)
      }

      return {
        success: true,
        data: {
          invoice_exists: !!invoice,
          invoice_id: invoice?.id,
          status: invoice?.status,
          sms_sent: invoice?.sms_sent,
          sms_sent_at: invoice?.sms_sent_at,
          sms_error: invoice?.sms_error
        }
      }
    } catch (error) {
      return {
        success: false,
        data: {
          invoice_exists: false
        }
      }
    }
  }

  static async getPractitionerInvoices(practitionerId: string): Promise<{
    success: boolean
    data?: any[]
    message?: string
  }> {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          appointment_id,
          client_name,
          client_phone,
          total_amount,
          status,
          sms_sent,
          sms_sent_at,
          created_at,
          appointments (
            appointment_date,
            start_time,
            end_time
          )
        `)
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`)
      }

      return {
        success: true,
        data: invoices || []
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch invoices'
      }
    }
  }
}
