export interface AppointmentFormData {
    service_id: string;
    appointment_date: string;
    start_time: string;
    notes?: string;
  }
  
  export interface UserProfileFormData {
    first_name: string;
    last_name: string;
    phone?: string;
    email: string;
  }
  
  export interface SignUpFormData {
    phone: string;
    first_name: string;
    last_name: string;
    otp_code?: string;
  }
  
  export interface SignInFormData {
    phone: string;
    otp_code?: string;
  }

  export interface OTPVerificationData {
    phone: string;
    otp_code: string;
    purpose: 'signup' | 'signin' | 'password_reset';
  }