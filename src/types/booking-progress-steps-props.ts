import { BookingStep } from "./booking-step";

export interface BookingProgressStepsProps {
  bookingStep: BookingStep;
  isPractitionerUser: boolean;
  visibleElements: Set<string>;
}