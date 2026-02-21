"use client";

import { formatPrice, formatDuration } from "@/lib/services";
import { PractitionerSelectionStepProps } from "@/types/practitioner-selection-steps-props";
import { CheckIcon } from "lucide-react";

export function PractitionerSelectionStep({
  practitioners,
  selectedPractitioner,
  selectedServices,
  visibleElements,
  onSelectPractitioner,
  onContinue,
  onBack,
}: PractitionerSelectionStepProps) {
  const totalDuration = selectedServices.reduce((t, s) => t + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((t, s) => t + (s.price || 0), 0);

  return (
    <div
      data-animate-id="practitioner-selection"
      style={{
        opacity: visibleElements.has("practitioner-selection") ? 1 : 0,
        transform: visibleElements.has("practitioner-selection") ? "translateY(0)" : "translateY(40px)",
        transition: "all 0.7s ease-out",
      }}
    >
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          ← Change Services
        </button>
      </div>

      {/* Services summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
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

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Practitioner</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {practitioners.map((practitioner) => {
          const isSelected = selectedPractitioner?.id === practitioner.id;
          return (
            <div
              key={practitioner.id}
              onClick={() => onSelectPractitioner(practitioner)}
              className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                isSelected ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {practitioner.first_name} {practitioner.last_name}
                  </h3>
                  {isSelected && <CheckIcon className="flex-shrink-0 ml-2 w-6 h-6 bg-indigo-600 rounded-full text-white p-1" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{practitioner.email}</p>
                  <p className="text-sm text-gray-600">{practitioner.phone}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPractitioner && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
          >
            Continue to Date &amp; Time
          </button>
        </div>
      )}
    </div>
  );
}