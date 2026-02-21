"use client";

import { ValidationInput } from "@/components/validation/ValidationComponents";
import { ClientSelectionStepProps } from "@/types/client-selection-step-props";
import { CheckIcon } from "lucide-react";

export function ClientSelectionStep({
  clients,
  selectedClient,
  isExternalClient,
  externalClientInfo,
  externalClientFormErrors,
  visibleElements,
  onSelectClient,
  onSelectExternal,
  onExternalInfoChange,
  onClearError,
  onContinue,
  onBack,
}: ClientSelectionStepProps) {
  return (
    <div
      data-animate-id="client-selection"
      style={{
        opacity: visibleElements.has("client-selection") ? 1 : 0,
        transform: visibleElements.has("client-selection") ? "translateY(0)" : "translateY(40px)",
        transition: "all 0.7s ease-out",
      }}
    >
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
          ← Change Services
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Client</h2>

      {/* External client option */}
      <div className="mb-6">
        <div
          onClick={onSelectExternal}
          className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
            isExternalClient ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-gray-200 hover:border-indigo-300"
          }`}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">New Client (Not Registered)</h3>
              {isExternalClient && <CheckIcon className="flex-shrink-0 ml-2 w-6 h-6 bg-indigo-600 rounded-full text-white p-1" />}
            </div>
            <p className="text-sm text-gray-600">Book appointment for a client who is not registered in the system</p>
          </div>
        </div>
      </div>

      {/* External client form */}
      {isExternalClient && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidationInput
              label="First Name"
              required
              error={externalClientFormErrors.firstName}
              name="firstName"
              type="text"
              value={externalClientInfo.firstName}
              onChange={(e) => {
                onExternalInfoChange({ ...externalClientInfo, firstName: e.target.value });
                onClearError("firstName");
              }}
              placeholder="Enter first name"
            />
            <ValidationInput
              label="Last Name"
              required
              error={externalClientFormErrors.lastName}
              name="lastName"
              type="text"
              value={externalClientInfo.lastName}
              onChange={(e) => {
                onExternalInfoChange({ ...externalClientInfo, lastName: e.target.value });
                onClearError("lastName");
              }}
              placeholder="Enter last name"
            />
            <ValidationInput
              label="Email"
              error={externalClientFormErrors.email}
              name="email"
              type="email"
              value={externalClientInfo.email}
              onChange={(e) => {
                onExternalInfoChange({ ...externalClientInfo, email: e.target.value });
                onClearError("email");
                onClearError("contactMethod");
              }}
              placeholder="Enter email address"
            />
            <ValidationInput
              label="Phone"
              error={externalClientFormErrors.phone}
              name="phone"
              type="tel"
              value={externalClientInfo.phone}
              onChange={(e) => {
                onExternalInfoChange({ ...externalClientInfo, phone: e.target.value });
                onClearError("phone");
                onClearError("contactMethod");
              }}
              placeholder="Enter phone number"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">* At least one contact method (email or phone) is required</p>
          {externalClientFormErrors.contactMethod && (
            <p className="text-red-500 text-sm mt-2">{externalClientFormErrors.contactMethod}</p>
          )}
        </div>
      )}

      {/* Registered clients */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Clients</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const isSelected = selectedClient?.id === client.id;
            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  isSelected ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.first_name} {client.last_name}
                    </h3>
                    {isSelected && <CheckIcon className="flex-shrink-0 ml-2 w-6 h-6 bg-indigo-600 rounded-full text-white p-1" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">{client.email}</p>
                    <p className="text-sm text-gray-600">{client.phone}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium"
        >
          Continue to Date &amp; Time
        </button>
      </div>
    </div>
  );
}