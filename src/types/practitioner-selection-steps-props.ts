import { Practitioner } from "./practitioner";
import { ServiceWithCategory } from "./service";

export interface PractitionerSelectionStepProps {
  practitioners: Practitioner[];
  selectedPractitioner: Practitioner | null;
  selectedServices: ServiceWithCategory[];
  visibleElements: Set<string>;
  onSelectPractitioner: (p: Practitioner) => void;
  onContinue: () => void;
  onBack: () => void;
}