import { ServiceWithCategory } from './service'

export interface AppointmentExtended {
  id: string
  user_id: string | null
  practitioner_id: string
  service_id: string | null
  service_ids: string[]
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  // External client information
  client_first_name?: string
  client_last_name?: string
  client_email?: string
  client_phone?: string
  is_external_client?: boolean
  client: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  } | null
  practitioner: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  } | null
  services?: ServiceWithCategory[]
}

export interface CompletedAppointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  client_first_name: string
  client_last_name: string
  client_email: string
  client_phone: string
  practitioner_id: string
  practitioner_first_name: string
  practitioner_last_name: string
  service_names: string[]
  notes: string
  status: string
}
