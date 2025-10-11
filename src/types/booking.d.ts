

export interface Practitioner {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface ExternalClientInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type BookingStep = 'service' | 'practitioner' | 'client' | 'datetime' | 'confirm'

export type ViewMode = 'day' | 'week' | 'month'
