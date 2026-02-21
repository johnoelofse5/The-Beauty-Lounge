export interface BookingProgressSaveProps {
  currentStep: number;
  hasSavedProgress: boolean;
  savingProgress: boolean;
  visibleElements: Set<string>;
  onClearProgress: () => void;
}