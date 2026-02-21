import { Client } from "./client";
import { ExternalClientInfo } from "./external-client-info";
import { Practitioner } from "./practitioner";
import { ServiceWithCategory } from "./service";

export interface ConfirmationStepProps {
  selectedServices: ServiceWithCategory[];
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