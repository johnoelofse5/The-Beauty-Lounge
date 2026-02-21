"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { SMSSettings } from "@/types/sms-settings";

//#region Permission check
function useBackOfficeAccess() {
    const { userRoleData, loading } = useAuth();
    const isSuperAdmin = userRoleData?.role?.name === "super_admin";
    return { hasAccess: isSuperAdmin, loading };
}
//#endregion

const DEFAULTS: SMSSettings = {
    send_sms_on_booking: true,
    send_sms_on_update: true,
    send_sms_on_cancellation: true,
    send_sms_reminder_hours: 24,
};

//#region Page
export default function BackOfficePage() {
    const { hasAccess, loading: authLoading } = useBackOfficeAccess();
    const router = useRouter();
    const { showSuccess, showError } = useToast();

    const [settings, setSettings] = useState<SMSSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !hasAccess) {
            router.replace("/");
        }
    }, [authLoading, hasAccess]);

    useEffect(() => {
        if (hasAccess) loadSettings();
    }, [hasAccess]);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from("app_settings")
                .select("send_sms_on_booking, send_sms_on_update, send_sms_on_cancellation, send_sms_reminder_hours")
                .single();
            if (error && error.code !== "PGRST116") throw error;
            if (data) setSettings({ ...DEFAULTS, ...data });
        } catch (err) {
            console.error("Error loading settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updates: Partial<SMSSettings>) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("app_settings")
                .upsert({ id: 1, ...settings, ...updates, updated_at: new Date().toISOString() });
            if (error) throw error;
            setSettings((prev) => ({ ...prev, ...updates }));
            showSuccess("Settings saved");
        } catch (err) {
            showError("Failed to save settings");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!hasAccess) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-1">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Back Office</h1>
                            <p className="text-sm text-gray-500">System configuration and settings</p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Super admin only
                        </span>
                        <span className="text-xs text-gray-400">Changes take effect immediately</span>
                    </div>
                </div>

                {/* SMS & Notifications Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">SMS & Notifications</h2>
                            <p className="text-xs text-gray-500">Configure automated messaging to clients and practitioners</p>
                        </div>
                    </div>

                    <SMSSettingsForm
                        settings={settings}
                        saving={saving}
                        onSave={handleSave}
                    />
                </div>

            </div>
        </div>
    );
}

//#endregion

//#region SMS Settings Form
function SMSSettingsForm({
  settings,
  saving,
  onSave,
}: {
  settings: SMSSettings;
  saving: boolean;
  onSave: (updates: Partial<SMSSettings>) => void;
}) {
  const [onBooking, setOnBooking] = useState(settings.send_sms_on_booking);
  const [onUpdate, setOnUpdate] = useState(settings.send_sms_on_update);
  const [onCancellation, setOnCancellation] = useState(settings.send_sms_on_cancellation);
  const [reminderHours, setReminderHours] = useState(settings.send_sms_reminder_hours);

  useEffect(() => {
    setOnBooking(settings.send_sms_on_booking);
    setOnUpdate(settings.send_sms_on_update);
    setOnCancellation(settings.send_sms_on_cancellation);
    setReminderHours(settings.send_sms_reminder_hours);
  }, [settings]);

  return (
    <div className="px-6 py-5 space-y-6">

      <ToggleRow
        label="Send SMS on booking confirmation"
        description="Notify the client and practitioner when a new appointment is booked"
        checked={onBooking}
        onChange={setOnBooking}
      />

      <div className="border-t border-gray-100" />

      <ToggleRow
        label="Send SMS on appointment update"
        description="Notify relevant parties when an appointment is rescheduled or modified"
        checked={onUpdate}
        onChange={setOnUpdate}
      />

      <div className="border-t border-gray-100" />

      <ToggleRow
        label="Send SMS on cancellation"
        description="Notify relevant parties when an appointment is cancelled"
        checked={onCancellation}
        onChange={setOnCancellation}
      />

      <div className="border-t border-gray-100" />

      {/* Reminder timing */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Appointment reminder</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Send a reminder SMS this many hours before the appointment
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-6">
            <input
              type="number"
              min={1}
              max={72}
              value={reminderHours}
              onChange={(e) =>
                setReminderHours(Math.max(1, Math.min(72, Number(e.target.value))))
              }
              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">hours before</span>
          </div>
        </div>
        {/* Quick-pick buttons */}
        <div className="mt-3 flex space-x-2">
          {[12, 24, 48].map((h) => (
            <button
              key={h}
              onClick={() => setReminderHours(h)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                reminderHours === h
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex justify-end">
        <button
          onClick={() =>
            onSave({
              send_sms_on_booking: onBooking,
              send_sms_on_update: onUpdate,
              send_sms_on_cancellation: onCancellation,
              send_sms_reminder_hours: reminderHours,
            })
          }
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors flex items-center space-x-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <span>Save changes</span>
          )}
        </button>
      </div>
    </div>
  );
}

//#endregion

//#region Toggle Row
function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1 pr-6">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? "bg-indigo-600" : "bg-gray-200"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}
//#endregion