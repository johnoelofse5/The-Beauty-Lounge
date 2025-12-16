export interface Appointment {
    id: string;
    user_id: string | null; 
    service_id: string;
    service_ids: string[]; 
    appointment_date: string; 
    start_time: string; 
    end_time: string; 
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    practitioner_id: string | null; 
    
    client_first_name?: string;
    client_last_name?: string;
    client_email?: string;
    client_phone?: string;
    is_external_client?: boolean;
    
    google_calendar_event_id?: string;
    
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }