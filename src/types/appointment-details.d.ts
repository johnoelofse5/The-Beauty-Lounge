export interface AppointmentWithDetails extends Appointment {
    user: User;
    service: Service;
  }