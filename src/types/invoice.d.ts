export interface InvoiceLineItem {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export interface Invoice {
  id: string
  appointment_id: string
  invoice_number: string
  client_id: string
  practitioner_id: string
  total_amount: number
  services_data: InvoiceLineItem[]
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

export interface InvoiceWithAppointment extends Invoice {
  appointment: {
    appointment_date: string
    start_time: string
    end_time: string
  }
}
