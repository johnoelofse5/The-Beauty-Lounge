"use client";

import { formatPrice, formatDuration } from "@/lib/services";
import { DatePicker } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import TimeSlotSelector from "@/components/TimeSlotSelector";
import { DateTimeStepProps } from "@/types/date-time-step-props";

export function DateTimeStep({
  selectedServices,
  selectedPractitioner,
  selectedClient,
  selectedDate,
  selectedTime,
  notes,
  blockedDates,
  existingAppointments,
  sendClientSMS,
  loadingSlots,
  isExternalClient,
  externalClientInfo,
  isPractitionerUser,
  isSuperAdmin,
  allowSameDayBooking,
  visibleElements,
  onDateChange,
  onTimeChange,
  onNotesChange,
  onSMSChange,
  onContinue,
  onBack,
  getTomorrowDate,
  getMaxDate,
}: DateTimeStepProps) {
  const totalDuration = selectedServices.reduce((t, s) => t + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((t, s) => t + (s.price || 0), 0);

  return (
    <div
      data-animate-id="datetime-selection"
      style={{
        opacity: visibleElements.has("datetime-selection") ? 1 : 0,
        transform: visibleElements.has("datetime-selection") ? "translateY(0)" : "translateY(40px)",
        transition: "all 0.7s ease-out",
      }}
    >
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          ← Change {isPractitionerUser ? "Client" : "Practitioner"}
        </button>
      </div>

      {/* Appointment details summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Services */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Services</h4>
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-700">{formatDuration(service.duration_minutes)}</p>
                  </div>
                  <div className="text-gray-900 font-semibold">{formatPrice(service.price || 0)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SMS toggle (practitioners/admins only) */}
          {(isPractitionerUser || isSuperAdmin) && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendClientSMS}
                  onChange={(e) => onSMSChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Send SMS notification to client</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">You will always receive appointment notifications</p>
            </div>
          )}

          {/* Client / Practitioner info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{isPractitionerUser ? "Client" : "Practitioner"}</h4>
            <div className="p-3 bg-gray-50 rounded-md">
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
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Total Duration:</p>
            <p className="text-sm text-gray-900">{formatDuration(totalDuration)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Total Price:</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(totalPrice)}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Date &amp; Time</h2>

      <div className="space-y-6">
        {/* Date picker */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Select Date</label>
          <DatePicker
            date={selectedDate}
            onDateChange={onDateChange}
            placeholder="Pick a date"
            minDate={allowSameDayBooking ? undefined : getTomorrowDate()}
            maxDate={getMaxDate()}
            allowSameDay={allowSameDayBooking}
            blockedDates={blockedDates}
            className="w-full max-w-sm"
          />
          <p className="mt-2 text-sm text-gray-500">
            {allowSameDayBooking
              ? "You can book appointments from today up to 3 months in advance"
              : "You can book appointments from tomorrow up to 3 months in advance"}
          </p>
        </div>

        {/* Time slot selector */}
        {selectedDate && selectedPractitioner && (
          <TimeSlotSelector
            key={`${selectedDate?.toISOString()}-${selectedPractitioner.id}`}
            selectedDate={selectedDate}
            practitionerId={selectedPractitioner.id}
            serviceDurationMinutes={totalDuration}
            existingAppointments={existingAppointments}
            onTimeSelect={onTimeChange}
            selectedTime={selectedTime}
            disabled={loadingSlots}
            allowOverlap={isPractitionerUser}
          />
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Notes (Optional)</label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Any special requests or notes for your appointment..."
            className="resize-none"
          />
        </div>

        {selectedDate && selectedTime && (
          <div className="flex justify-end">
            <button
              onClick={onContinue}
              className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Continue to Confirmation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}