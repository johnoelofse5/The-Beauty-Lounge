"use client";

import { ServiceWithCategory } from "@/types";
import { formatPrice, formatDuration } from "@/lib/services";
import { ServiceSelectionStepProps } from "@/types/service-selection-steps-props";
import { CheckIcon } from "lucide-react";

export function ServiceSelectionStep({
  services,
  selectedServices,
  visibleElements,
  isPractitionerUser,
  showFloatingPill,
  onServiceSelect,
  onContinue,
}: ServiceSelectionStepProps) {
  const categorized = Object.entries(
    services.reduce((acc, service) => {
      const cat = service.category_name || "Other Services";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {} as Record<string, ServiceWithCategory[]>)
  ).sort(([, a], [, b]) => (a[0]?.category_display_order || 999) - (b[0]?.category_display_order || 999));

  const totalDuration = selectedServices.reduce((t, s) => t + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((t, s) => t + (s.price || 0), 0);

  return (
    <>
      <div
        data-animate-id="service-selection"
        style={{
          opacity: visibleElements.has("service-selection") ? 1 : 0,
          transform: visibleElements.has("service-selection") ? "translateY(0)" : "translateY(40px)",
          transition: "all 0.7s ease-out",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Choose Services</h2>
          {selectedServices.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>

        {/* Sticky category nav */}
        <div className="sticky top-0 z-10 bg-gray-50 py-4 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2">
            {categorized.map(([categoryName]) => (
              <button
                key={categoryName}
                onClick={() => {
                  document
                    .getElementById(`category-${categoryName.replace(/\s+/g, "-").toLowerCase()}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex-shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap shadow-sm"
              >
                {categoryName}
              </button>
            ))}
          </div>
        </div>

        {/* Service categories */}
        <div className="space-y-8">
          {categorized.map(([categoryName, categoryServices]) => (
            <div
              key={categoryName}
              id={`category-${categoryName.replace(/\s+/g, "-").toLowerCase()}`}
              className="space-y-4"
            >
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-xl font-semibold text-gray-900">{categoryName}</h3>
                {categoryServices[0]?.category_description && (
                  <p className="text-sm text-gray-600 mt-1">{categoryServices[0].category_description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categoryServices.map((service, idx) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => onServiceSelect(service)}
                      data-animate-id={`service-card-${service.id}`}
                      style={{
                        opacity: visibleElements.has(`service-card-${service.id}`) ? 1 : 0,
                        transform: visibleElements.has(`service-card-${service.id}`) ? "translateY(0)" : "translateY(30px)",
                        transition: `all 0.6s ease-out ${idx * 0.1}s`,
                      }}
                      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
                          {isSelected && <CheckIcon className="flex-shrink-0 ml-2 w-6 h-6 bg-indigo-600 rounded-full text-white p-1" />}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</div>
                          <div className="text-lg font-bold text-gray-900">{formatPrice(service.price || 0)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected services summary */}
        {selectedServices.length > 0 && (
          <div id="selected-services-section" className="mt-6 sm:mt-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
            <div className="space-y-3">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <CheckIcon className="w-5 h-5 bg-indigo-600 rounded-full text-white p-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{formatPrice(service.price || 0)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Duration:</p>
                  <p className="text-sm text-gray-500">{formatDuration(totalDuration)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Total Price:</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(totalPrice)}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={onContinue}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
              >
                Continue to {isPractitionerUser ? "Client" : "Practitioner"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating pill */}
      {selectedServices.length > 0 && (
        <div
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${
            showFloatingPill ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <button
            onClick={() =>
              document.getElementById("selected-services-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center space-x-2 font-medium min-w-[280px]"
          >
            <span>
              {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""} selected
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}