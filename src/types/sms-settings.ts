export interface SMSSettings {
  send_sms_on_booking: boolean;
  send_sms_on_update: boolean;
  send_sms_on_cancellation: boolean;
  send_sms_reminder_hours: number;
}

export interface EmailSettings {
  send_email_on_booking: boolean;
  send_email_on_invoice: boolean;
  send_calendar_invite_email: boolean;
}
