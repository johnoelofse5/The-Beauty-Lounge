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
  
  export interface ServiceFormData {
    name: string;
    description?: string;
    duration_minutes: number;
    price?: number;
    is_active: boolean;
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