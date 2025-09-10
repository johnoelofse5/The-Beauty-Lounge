export interface EmailTracking {
  id: string
  email: string
  email_type: EmailType
  subject?: string
  status: EmailStatus
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  error_message?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export type EmailType = 
  | 'password_reset'
  | 'welcome'
  | 'appointment_confirmation'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'user_invitation'
  | 'system_notification'

export type EmailStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'

export interface EmailTrackingCreate {
  email: string
  email_type: EmailType
  subject?: string
  status?: EmailStatus
  metadata?: Record<string, any>
}

export interface EmailTrackingUpdate {
  status?: EmailStatus
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  error_message?: string
  metadata?: Record<string, any>
}
