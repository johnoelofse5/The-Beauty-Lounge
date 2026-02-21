"use client";

import { formatPrice, formatDuration } from "@/lib/services";
import { ConfirmationStepProps } from "@/types/confirmation-step-props";

export function ConfirmationStep({
  selectedServices,
  selectedPractitioner,
  selectedClient,
  selectedDate,
  selectedTime,
  notes,
  sendClientSMS,
  isExternalClient,
  externalClientInfo,
  isPractitionerUser,
  canControlClientSMS,
  isBooking,
  visibleElements,
  onConfirm,
  onStartOver,
  onBack,
  formatTimeDisplay,
}: ConfirmationStepProps) {
  const totalDuration = selectedServices.reduce((t, s) => t + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((t, s) => t + (s.price || 0), 0);

  const [startHours, startMinutes] = selectedTime.split(":").map(Number);
  const endMins = startHours * 60 + startMinutes + totalDuration;
  const endTimeString = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;

  return (
    <div
      data-animate-id="confirmation"
      style={{
        opacity: visibleElements.has("confirmation") ? 1 : 0,
        transform: visibleElements.has("confirmation") ? "translateY(0)" : "translateY(40px)",
        transition: "all 0.7s ease-out",
      }}
    >
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          ← Change Date &amp; Time
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Appointment</h2>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
        <div className="space-y-4">

          {/* Services */}
          <div>
            <span className="text-gray-900 font-medium">Services:</span>
            <div className="mt-2 space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-700">{formatDuration(service.duration_minutes)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatPrice(service.price || 0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Client / Practitioner */}
          <div>
            <span className="text-gray-900 font-medium">{isPractitionerUser ? "Client:" : "Practitioner:"}</span>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              {isPractitionerUser ? (
                isExternalClient ? (
                  <>
                    <p className="font-medium text-gray-900">{externalClientInfo.firstName} {externalClientInfo.lastName}</p>
                    {externalClientInfo.email && <p className="text-sm text-gray-600">{externalClientInfo.email}</p>}
                    {externalClientInfo.phone && <p className="text-sm text-gray-600">{externalClientInfo.phone}</p>}
                    <p className="text-xs text-gray-500 mt-1">(External Client)</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{selectedClient?.first_name} {selectedClient?.last_name}</p>
                    <p className="text-sm text-gray-600">{selectedClient?.email}</p>
                    <p className="text-sm text-gray-600">{selectedClient?.phone}</p>
                  </>
                )
              ) : (
                <>
                  <p className="font-medium text-gray-900">{selectedPractitioner?.first_name} {selectedPractitioner?.last_name}</p>
                  <p className="text-sm text-gray-600">{selectedPractitioner?.email}</p>
                  <p className="text-sm text-gray-600">{selectedPractitioner?.phone}</p>
                </>
              )}
            </div>
          </div>

          <Row label="Total Duration:" value={formatDuration(totalDuration)} />

          <Row
            label="Date:"
            value={new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />

          <Row label="Start Time:" value={formatTimeDisplay(selectedTime)} />
          <Row label="End Time:" value={formatTimeDisplay(endTimeString)} />

          <div className="flex justify-between border-t pt-4">
            <span className="text-gray-900 font-medium">Total Price:</span>
            <span className="font-bold text-gray-900 text-xl">{formatPrice(totalPrice)}</span>
          </div>

          {notes && (
            <div>
              <span className="text-gray-900 font-medium">Notes:</span>
              <p className="mt-1 text-sm text-gray-900">{notes}</p>
            </div>
          )}

          {/* SMS notification status */}
          {canControlClientSMS && (
            <div>
              <span className="text-gray-900 font-medium">Client Notification:</span>
              <p className="mt-1 text-sm">
                {sendClientSMS ? (
                  <span className="inline-flex items-center text-green-600">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Client will receive SMS notification
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-600">
                    <XCircleIcon className="w-4 h-4 mr-1" />
                    Client will NOT receive SMS notification
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Practitioner will always receive notification</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onStartOver}
          className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 lg:px-6 lg:py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium text-sm lg:text-base transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={onConfirm}
          disabled={isBooking}
          className="flex-1 bg-green-600 text-white px-3 py-2 lg:px-8 lg:py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium text-sm lg:text-base transition-colors disabled:opacity-60"
        >
          {isBooking ? "Confirming..." : "Confirm Appointment"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-900 font-medium">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}