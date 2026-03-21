import { Client } from './client';
import { ExternalClientInfo } from './external-client-info';
import { Practitioner } from './practitioner';
import { ServiceWithCategory } from './service';
import { SelectedServiceOptions } from './service-option';

export interface ConfirmationStepProps {
  selectedServices: ServiceWithCategory[];
  selectedServiceOptions: SelectedServiceOptions;
  selectedPractitioner: Practitioner | null;
  selectedClient: Client | null;
  selectedDate: Date;
  selectedTime: string;
  notes: string;
  sendClientSMS: boolean;
  isExternalClient: boolean;
  externalClientInfo: ExternalClientInfo;
  isPractitionerUser: boolean;
  canControlClientSMS: boolean;
  isBooking: boolean;
  visibleElements: Set<string>;
  onConfirm: () => void;
  onStartOver: () => void;
  onBack: () => void;
  formatTimeDisplay: (time: string) => string;
}
