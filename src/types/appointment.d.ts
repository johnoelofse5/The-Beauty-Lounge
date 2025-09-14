export interface Appointment {
    id: string;
    user_id: string | null; // Can be null for external clients
    service_id: string;
    service_ids: string[]; // Array of service IDs
    appointment_date: string; // YYYY-MM-DD format
    start_time: string; // HH:MM:SS format
    end_time: string; // HH:MM:SS format (auto-calculated)
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    practitioner_id: string | null; // Practitioner assigned to the appointment
    // Client information for external clients (not registered users)
    client_first_name?: string;
    client_last_name?: string;
    client_email?: string;
    client_phone?: string;
    is_external_client?: boolean;
    // Common fields
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }