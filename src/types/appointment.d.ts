export interface Appointment {
    id: string;
    user_id: string;
    service_id: string;
    appointment_date: string; // YYYY-MM-DD format
    start_time: string; // HH:MM:SS format
    end_time: string; // HH:MM:SS format (auto-calculated)
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    created_at: string;
    updated_at: string;
  }