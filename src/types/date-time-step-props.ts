
import { Client } from "./client";
import { ExternalClientInfo } from "./external-client-info";
import { Practitioner } from "./practitioner";
import { ServiceWithCategory } from "./service";

export interface DateTimeStepProps {
  selectedServices: ServiceWithCategory[];
  selectedPractitioner: Practitioner | null;
  selectedClient: Client | null;
  selectedDate: Date | undefined;
  selectedTime: string;
  notes: string;
  blockedDates: string[];
  existingAppointments: any[];
  sendClientSMS: boolean;
  loadingSlots: boolean;
  isExternalClient: boolean;
  externalClientInfo: ExternalClientInfo;
  isPractitionerUser: boolean;
  isSuperAdmin: boolean;
  allowSameDayBooking: boolean;
  visibleElements: Set<string>;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
  onSMSChange: (send: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
  getTomorrowDate: () => Date;
  getMaxDate: () => Date;
}