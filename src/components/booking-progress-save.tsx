"use client";

import { BookingProgressSaveProps } from "@/types/booking-progress-save-props";

export function BookingProgressSave({
  currentStep,
  hasSavedProgress,
  savingProgress,
  visibleElements,
  onClearProgress,
}: BookingProgressSaveProps) {
  if (currentStep <= 1) return null;

  return (
    <div
      className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg transition-all duration-700 ease-out"
      data-animate-id="progress-save"
      style={{
        opacity: visibleElements.has("progress-save") ? 1 : 0,
        transform: visibleElements.has("progress-save") ? "translateY(0)" : "translateY(20px)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {hasSavedProgress ? "Progress automatically saved" : "Saving progress..."}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Your booking progress is saved and will be restored when you return.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClearProgress}
            className="px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Clear Progress
          </button>
          {savingProgress && (
            <div className="flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}