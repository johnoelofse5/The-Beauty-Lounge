export type SMSStatus = 'sent' | 'suppressed' | 'failed' | 'scheduled';
export type SMSType = 'confirmation' | 'reschedule' | 'cancellation' | 'reminder';

export interface SMSLog {
  id: string | number;
  appointment_id: string;
  sms_type: SMSType;
  status: SMSStatus;
  reason: string | null;
  client_sms_sent: boolean;
  practitioner_sms_sent: boolean;
  scheduled: boolean;
  schedule_date: string | null;
  cancelled: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface SMSStats {
  total: number;
  sent: number;
  suppressed: number;
  failed: number;
  scheduled: number;
}
