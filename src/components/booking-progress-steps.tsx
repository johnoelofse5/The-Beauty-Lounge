'use client';

import { BookingProgressStepsProps } from '@/types/booking-progress-steps-props';
import { BookingStep } from '@/types/booking-step';

export function BookingProgressSteps({
  bookingStep,
  isPractitionerUser,
  visibleElements,
}: BookingProgressStepsProps) {
  const activeClass = 'text-indigo-600';
  const completedClass = 'text-green-600';
  const inactiveClass = 'text-gray-400';

  const activeDot = 'border-indigo-600 bg-indigo-600 text-white';
  const completedDot = 'border-green-600 bg-green-600 text-white';
  const inactiveDot = 'border-gray-300';

  const isCompleted = (steps: BookingStep[]) => steps.includes(bookingStep);
  const isActive = (step: BookingStep) => bookingStep === step;

  const serviceColor = isActive(BookingStep.Service)
    ? activeClass
    : isCompleted([
          BookingStep.Practitioner,
          BookingStep.Client,
          BookingStep.DateTime,
          BookingStep.Confirm,
        ])
      ? completedClass
      : inactiveClass;

  const serviceDot = isActive(BookingStep.Service)
    ? activeDot
    : isCompleted([
          BookingStep.Practitioner,
          BookingStep.Client,
          BookingStep.DateTime,
          BookingStep.Confirm,
        ])
      ? completedDot
      : inactiveDot;

  const step2Color = isActive(isPractitionerUser ? BookingStep.Client : BookingStep.Practitioner)
    ? activeClass
    : isCompleted([BookingStep.DateTime, BookingStep.Confirm])
      ? completedClass
      : inactiveClass;

  const step2Dot = isActive(isPractitionerUser ? BookingStep.Client : BookingStep.Practitioner)
    ? activeDot
    : isCompleted([BookingStep.DateTime, BookingStep.Confirm])
      ? completedDot
      : inactiveDot;

  const datetimeColor = isActive(BookingStep.DateTime)
    ? activeClass
    : isCompleted([BookingStep.Confirm])
      ? completedClass
      : inactiveClass;

  const datetimeDot = isActive(BookingStep.DateTime)
    ? activeDot
    : isCompleted([BookingStep.Confirm])
      ? completedDot
      : inactiveDot;

  const confirmColor = isActive(BookingStep.Confirm) ? activeClass : inactiveClass;
  const confirmDot = isActive(BookingStep.Confirm) ? activeDot : inactiveDot;

  return (
    <div
      className="mb-8 transition-all duration-700 ease-out"
      data-animate-id="progress-steps"
      style={{
        opacity: visibleElements.has('progress-steps') ? 1 : 0,
        transform: visibleElements.has('progress-steps') ? 'translateY(0)' : 'translateY(30px)',
      }}
    >
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-center space-x-6">
        <StepItem label="Services" number={1} colorClass={serviceColor} dotClass={serviceDot} />
        <StepItem
          label={isPractitionerUser ? 'Client' : 'Practitioner'}
          number={2}
          colorClass={step2Color}
          dotClass={step2Dot}
        />
        <StepItem
          label="Date & Time"
          number={3}
          colorClass={datetimeColor}
          dotClass={datetimeDot}
        />
        <StepItem label="Confirm" number={4} colorClass={confirmColor} dotClass={confirmDot} />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{
              width:
                bookingStep === BookingStep.Service
                  ? '25%'
                  : bookingStep === BookingStep.DateTime
                    ? '50%'
                    : bookingStep === BookingStep.Confirm
                      ? '75%'
                      : '100%',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <MobileStepItem
            label="Services"
            number={1}
            colorClass={serviceColor}
            dotClass={serviceDot}
          />
          <MobileStepItem
            label="Date & Time"
            number={2}
            colorClass={datetimeColor}
            dotClass={datetimeDot}
          />
          <MobileStepItem
            label="Confirm"
            number={3}
            colorClass={confirmColor}
            dotClass={confirmDot}
          />
        </div>
      </div>
    </div>
  );
}

function StepItem({
  label,
  number,
  colorClass,
  dotClass,
}: {
  label: string;
  number: number;
  colorClass: string;
  dotClass: string;
}) {
  return (
    <div className={`flex items-center ${colorClass}`}>
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${dotClass}`}
      >
        {number}
      </div>
      <span className="ml-2 text-sm font-medium">{label}</span>
    </div>
  );
}

function MobileStepItem({
  label,
  number,
  colorClass,
  dotClass,
}: {
  label: string;
  number: number;
  colorClass: string;
  dotClass: string;
}) {
  return (
    <div className={`flex flex-col items-center ${colorClass}`}>
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium mb-1 ${dotClass}`}
      >
        {number}
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  );
}
