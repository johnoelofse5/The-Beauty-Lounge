import { ServiceOption, SelectedServiceOptions } from './service-option';
import { ServiceWithCategory } from './service';

export interface ServiceSelectionStepProps {
  services: ServiceWithCategory[];
  selectedServices: ServiceWithCategory[];
  serviceOptionsMap: Record<string, ServiceOption[]>;
  selectedServiceOptions: SelectedServiceOptions;
  visibleElements: Set<string>;
  isPractitionerUser: boolean;
  showFloatingPill: boolean;
  onServiceSelect: (service: ServiceWithCategory) => void;
  onOptionSelect: (serviceId: string, option: ServiceOption | null) => void;
  onContinue: () => void;
}
