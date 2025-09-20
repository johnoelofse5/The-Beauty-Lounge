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
    email: string;
    password: string;
    confirmPassword: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }
  
  export interface SignInFormData {
    email: string;
    password: string;
  }