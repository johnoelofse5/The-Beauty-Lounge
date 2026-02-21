import { ServiceWithCategory } from "./service";

export interface ServiceSelectionStepProps {
  services: ServiceWithCategory[];
  selectedServices: ServiceWithCategory[];
  visibleElements: Set<string>;
  isPractitionerUser: boolean;
  showFloatingPill: boolean;
  onServiceSelect: (service: ServiceWithCategory) => void;
  onContinue: () => void;
}