"use client";

import { BookingProgressSave } from "@/components/booking-progress-save";
import { BookingProgressSteps } from "@/components/booking-progress-steps";
import { useAppointmentBooking } from "@/hooks/use-appointment-booking";
import { ClientSelectionStep } from "@/steps/client-selection-step";
import { ConfirmationStep } from "@/steps/confirmation-step";
import { DateTimeStep } from "@/steps/date-time-step";
import { PractitionerSelectionStep } from "@/steps/practitioner-selection-step";
import { ServiceSelectionStep } from "@/steps/service-selection-step";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";


export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const b = useAppointmentBooking();

  useEffect(() => {
    const serviceId = searchParams.get("serviceId");
    if (serviceId && b.services.length > 0) {
      const match = b.services.find((s) => s.id === serviceId);
      if (match && !b.selectedServices.find((s) => s.id === serviceId)) {
        b.handleServiceSelect(match);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("serviceId");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, [b.services, searchParams]);

  if (b.authLoading || b.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!b.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You must be logged in to book appointments.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <BookingProgressSteps
          bookingStep={b.bookingStep}
          isPractitionerUser={b.isPractitionerUser}
          visibleElements={b.visibleElements}
        />

        <BookingProgressSave
          currentStep={b.currentStep}
          hasSavedProgress={b.hasSavedProgress}
          savingProgress={b.savingProgress}
          visibleElements={b.visibleElements}
          onClearProgress={b.clearProgress}
        />

        {b.bookingStep === "service" && (
          <ServiceSelectionStep
            services={b.services}
            selectedServices={b.selectedServices}
            visibleElements={b.visibleElements}
            isPractitionerUser={b.isPractitionerUser}
            showFloatingPill={b.showFloatingPill}
            onServiceSelect={b.handleServiceSelect}
            onContinue={b.handleContinueToPractitioner}
          />
        )}

        {b.bookingStep === "practitioner" && (
          <PractitionerSelectionStep
            practitioners={b.practitioners}
            selectedPractitioner={b.selectedPractitioner}
            selectedServices={b.selectedServices}
            visibleElements={b.visibleElements}
            onSelectPractitioner={b.setSelectedPractitioner}
            onContinue={b.handleContinueToDateTime}
            onBack={() => b.updateCurrentStep("service")}
          />
        )}

        {b.bookingStep === "client" && b.isPractitionerUser && (
          <ClientSelectionStep
            clients={b.clients}
            selectedClient={b.selectedClient}
            isExternalClient={b.isExternalClient}
            externalClientInfo={b.externalClientInfo}
            externalClientFormErrors={b.externalClientFormErrors}
            visibleElements={b.visibleElements}
            onSelectClient={(client) => {
              b.setSelectedClient(client);
              b.setIsExternalClient(false);
            }}
            onSelectExternal={() => {
              b.setIsExternalClient(true);
              b.setSelectedClient(null);
            }}
            onExternalInfoChange={b.setExternalClientInfo}
            onClearError={(field) =>
              b.setExternalClientFormErrors((prev) => ({ ...prev, [field]: "" }))
            }
            onContinue={b.handleContinueToDateTime}
            onBack={() => b.updateCurrentStep("service")}
          />
        )}

        {b.bookingStep === "datetime" &&
          b.selectedServices.length > 0 &&
          ((b.isPractitionerUser && (b.selectedClient || b.isExternalClient)) ||
            (!b.isPractitionerUser && b.selectedPractitioner)) && (
            <DateTimeStep
              selectedServices={b.selectedServices}
              selectedPractitioner={b.selectedPractitioner}
              selectedClient={b.selectedClient}
              selectedDate={b.selectedDate}
              selectedTime={b.selectedTime}
              notes={b.notes}
              blockedDates={b.blockedDates}
              existingAppointments={b.existingAppointments}
              sendClientSMS={b.sendClientSMS}
              loadingSlots={b.loadingSlots}
              isExternalClient={b.isExternalClient}
              externalClientInfo={b.externalClientInfo}
              isPractitionerUser={b.isPractitionerUser}
              isSuperAdmin={b.isSuperAdmin}
              allowSameDayBooking={b.allowSameDayBooking}
              visibleElements={b.visibleElements}
              onDateChange={b.setSelectedDate}
              onTimeChange={b.setSelectedTime}
              onNotesChange={b.setNotes}
              onSMSChange={b.setSendClientSMS}
              onContinue={b.handleDateTimeConfirm}
              onBack={() => b.updateCurrentStep(b.isPractitionerUser ? "client" : "practitioner")}
              getTomorrowDate={b.getTomorrowDate}
              getMaxDate={b.getMaxDate}
            />
          )}

        {b.bookingStep === "confirm" &&
          b.selectedServices.length > 0 &&
          ((b.isPractitionerUser && (b.selectedClient || b.isExternalClient)) ||
            (!b.isPractitionerUser && b.selectedPractitioner)) &&
          b.selectedDate &&
          b.selectedTime && (
            <ConfirmationStep
              selectedServices={b.selectedServices}
              selectedPractitioner={b.selectedPractitioner}
              selectedClient={b.selectedClient}
              selectedDate={b.selectedDate}
              selectedTime={b.selectedTime}
              notes={b.notes}
              sendClientSMS={b.sendClientSMS}
              isExternalClient={b.isExternalClient}
              externalClientInfo={b.externalClientInfo}
              isPractitionerUser={b.isPractitionerUser}
              canControlClientSMS={b.canControlClientSMS}
              isBooking={b.isBooking}
              visibleElements={b.visibleElements}
              onConfirm={b.handleBookingConfirm}
              onStartOver={() => b.updateCurrentStep("service")}
              onBack={() => b.updateCurrentStep("datetime")}
              formatTimeDisplay={b.formatTimeDisplay}
            />
          )}

      </main>
    </div>
  );
}