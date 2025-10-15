import { supabase } from './supabase'

export interface InvoiceService {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export interface InvoiceData {
  id: string
  appointment_id: string
  invoice_number: string
  client_id: string
  practitioner_id: string
  total_amount: number
  services_data: InvoiceService[]
  client_name: string
  client_phone: string
  client_email?: string
  appointment_date: string
  invoice_date: string
  status: 'generated' | 'sent' | 'failed' | 'delivered'
  sms_sent: boolean
  sms_sent_at?: string
  sms_error?: string
  pdf_url?: string
  created_at: string
  updated_at: string
}

export interface AppointmentWithServices {
  id: string
  user_id: string
  appointment_date: string
  start_time: string
  end_time: string
  client_first_name: string
  client_last_name: string
  client_email?: string
  client_phone: string
  practitioner_id: string
  practitioner_first_name: string
  practitioner_last_name: string
  service_names: string[]
  services_data: InvoiceService[]
  notes?: string
  status: string
}

export class InvoiceService {
  static async generateInvoice(appointmentId: string, currentUserId?: string): Promise<InvoiceData> {
    try {
      const appointmentData = await this.getAppointmentWithServices(appointmentId)
      
      if (!appointmentData) {
        throw new Error('Appointment not found')
      }

      const totalAmount = appointmentData.services_data.reduce(
        (sum, service) => sum + service.price, 
        0
      )

      const { data: invoiceNumber, error: invoiceNumberError } = await supabase
        .rpc('generate_invoice_number')

      if (invoiceNumberError) {
        throw new Error(`Failed to generate invoice number: ${invoiceNumberError.message}`)
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          appointment_id: appointmentId,
          invoice_number: invoiceNumber,
          client_id: appointmentData.user_id || appointmentData.practitioner_id,
          practitioner_id: currentUserId || appointmentData.practitioner_id,
          total_amount: totalAmount,
          services_data: appointmentData.services_data,
          client_name: `${appointmentData.client_first_name} ${appointmentData.client_last_name}`,
          client_phone: appointmentData.client_phone,
          client_email: appointmentData.client_email,
          appointment_date: appointmentData.appointment_date,
          status: 'generated'
        })
        .select()
        .single()

      if (invoiceError) {
        throw new Error(`Failed to create invoice: ${invoiceError.message}`)
      }

      return invoice
    } catch (error) {
      throw error
    }
  }

  static async getAppointmentWithServices(appointmentId: string): Promise<AppointmentWithServices | null> {
    try {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          user_id,
          practitioner_id,
          notes,
          status
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError) {
        throw new Error(`Failed to fetch appointment: ${appointmentError.message}`)
      }

      const { data: client, error: clientError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', appointment.user_id)
        .single()

      if (clientError) {
        throw new Error(`Failed to fetch client: ${clientError.message}`)
      }

      const { data: practitioner, error: practitionerError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', appointment.practitioner_id)
        .single()

      if (practitionerError) {
        throw new Error(`Failed to fetch practitioner: ${practitionerError.message}`)
      }

      const serviceIds: string[] = Array.isArray((appointment as any).service_ids)
        ? (appointment as any).service_ids.filter((id: any) => typeof id === 'string')
        : ((appointment as any).service_id ? [(appointment as any).service_id] : [])

      let servicesData: InvoiceService[] = []
      if (serviceIds.length > 0) {
        const { data: servicesRows, error: servicesFetchError } = await supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .in('id', serviceIds)

        if (servicesFetchError) {
          throw new Error(`Failed to fetch services: ${servicesFetchError.message}`)
        }

        servicesData = (servicesRows || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price || 0,
          duration_minutes: s.duration_minutes
        }))
      }

      const serviceNames = servicesData.map(service => service.name)

      return {
        id: appointment.id,
        user_id: appointment.user_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        client_first_name: client.first_name,
        client_last_name: client.last_name,
        client_email: client.email,
        client_phone: client.phone,
        practitioner_id: appointment.practitioner_id,
        practitioner_first_name: practitioner.first_name,
        practitioner_last_name: practitioner.last_name,
        service_names: serviceNames,
        services_data: servicesData,
        notes: appointment.notes,
        status: appointment.status
      }
    } catch (error) {
      console.error('Error fetching appointment with services:', error)
      return null
    }
  }

  static async getInvoice(invoiceId: string): Promise<InvoiceData | null> {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch invoice: ${error.message}`)
      }

      return invoice
    } catch (error) {
      console.error('Error fetching invoice:', error)
      return null
    }
  }

  static async getPractitionerInvoices(practitionerId: string): Promise<InvoiceData[]> {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch practitioner invoices: ${error.message}`)
      }

      return invoices || []
    } catch (error) {
      console.error('Error fetching practitioner invoices:', error)
      return []
    }
  }

  static async updateInvoiceStatus(
    invoiceId: string, 
    status: 'generated' | 'sent' | 'failed' | 'delivered',
    smsSent: boolean = false,
    smsError?: string,
    pdfUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        sms_sent: smsSent
      }

      if (smsSent) {
        updateData.sms_sent_at = new Date().toISOString()
      }

      if (smsError) {
        updateData.sms_error = smsError
      }

      if (pdfUrl) {
        updateData.pdf_url = pdfUrl
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)

      if (error) {
        throw new Error(`Failed to update invoice status: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating invoice status:', error)
      throw error
    }
  }

  static async getInvoiceByAppointment(appointmentId: string): Promise<InvoiceData | null> {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check existing invoice: ${error.message}`)
      }

      return invoice || null
    } catch (error) {
      console.error('Error checking existing invoice:', error)
      return null
    }
  }
}
