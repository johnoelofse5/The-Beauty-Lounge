"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { indexedDBService, LookupData } from "@/lib/indexeddb-service";
import { LOOKUP_TYPE_CODES } from "@/constants/lookup-codes";

type SMSStatus = "sent" | "suppressed" | "failed" | "scheduled";
type SMSType = "confirmation" | "reschedule" | "cancellation" | "reminder";

interface SMSLog {
  id: string | number;
  appointment_id: string;
  sms_type: SMSType;
  status: SMSStatus;
  reason: string | null;
  client_sms_sent: boolean;
  practitioner_sms_sent: boolean;
  scheduled: boolean;
  schedule_date: string | null;
  cancelled: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

interface SMSStats {
  total: number;
  sent: number;
  suppressed: number;
  failed: number;
  scheduled: number;
}

async function getAllSMSLogs(): Promise<SMSLog[]> {
  const { data, error } = await supabase
    .from("sms_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function getSMSStats(): Promise<SMSStats> {
  const { data, error } = await supabase.from("sms_logs").select("status");

  if (error) throw new Error(error.message);

  const logs = data || [];
  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    suppressed: logs.filter((l) => l.status === "suppressed").length,
    failed: logs.filter((l) => l.status === "failed").length,
    scheduled: logs.filter((l) => l.status === "scheduled").length,
  };
}

export default function SmsTrackingPage() {
  const { user, userRoleData } = useAuth();
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [stats, setStats] = useState<SMSStats>({
    total: 0,
    sent: 0,
    suppressed: 0,
    failed: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SMSStatus | "all">("all");
  const [filterType, setFilterType] = useState<SMSType | "all">("all");
  const [statusOptions, setStatusOptions] = useState<LookupData[]>([])
  const [typeOptions, setTypeOptions] = useState<LookupData[]>([])

  useEffect(() => {
    if (user && userRoleData) {
      loadSMSLogs();
    }
  }, [user, userRoleData]);

  useEffect(() => {
    async function loadFilterOptions() {
      const [statuses, types] = await Promise.all([
        indexedDBService.getLookupData(LOOKUP_TYPE_CODES.SMS_STATUS),
        indexedDBService.getLookupData(LOOKUP_TYPE_CODES.SMS_FILTER_TYPE),
      ])
      setStatusOptions(statuses ?? [])
      setTypeOptions(types ?? [])
    }
    loadFilterOptions()
  }, [])

  const loadSMSLogs = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        getAllSMSLogs(),
        getSMSStats(),
      ]);
      setSmsLogs(logsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SMS logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = smsLogs.filter((log) => {
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesType = filterType === "all" || log.sms_type === filterType;
    return matchesStatus && matchesType;
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  const getStatusColor = (status: SMSStatus) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "suppressed":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: SMSType) => {
    switch (type) {
      case "confirmation":
        return "bg-blue-100 text-blue-800";
      case "reschedule":
        return "bg-yellow-100 text-yellow-800";
      case "cancellation":
        return "bg-red-100 text-red-800";
      case "reminder":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SMS logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.sent}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.suppressed}
            </div>
            <div className="text-sm text-gray-600">Suppressed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.failed}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.scheduled}
            </div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <Select
                value={filterStatus}
                onValueChange={(value) =>
                  setFilterStatus(value as SMSStatus | "all")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map(option => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <Select
                value={filterType}
                onValueChange={(value) =>
                  setFilterType(value as SMSType | "all")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {typeOptions.map(option => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SMS Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              SMS Log Records
            </h3>
            <p className="text-sm text-gray-600">
              Showing {filteredLogs.length} of {smsLogs.length} records
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client SMS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Practitioner SMS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {String(log.appointment_id).substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.sms_type)}`}
                        >
                          {log.sms_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.client_sms_sent ? (
                          <span className="text-green-600 font-medium">
                            ✓ Sent
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.practitioner_sms_sent ? (
                          <span className="text-green-600 font-medium">
                            ✓ Sent
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.reason ? (
                          <span
                            className={
                              log.status === "failed"
                                ? "text-red-600"
                                : "text-gray-500"
                            }
                            title={log.reason}
                          >
                            {log.reason.length > 50
                              ? `${log.reason.substring(0, 50)}...`
                              : log.reason}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            <div className="space-y-4 p-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-mono text-gray-700 truncate">
                        {String(log.appointment_id).substring(0, 8)}...
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1 ml-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                      >
                        {log.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.sms_type)}`}
                      >
                        {log.sms_type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Client SMS:</span>
                      <span>{log.client_sms_sent ? "✓ Sent" : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Practitioner SMS:</span>
                      <span>{log.practitioner_sms_sent ? "✓ Sent" : "—"}</span>
                    </div>
                    {log.reason && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                        <span
                          className={`text-xs ${log.status === "failed" ? "text-red-600" : "text-gray-600"}`}
                        >
                          {log.reason}
                        </span>
                      </div>
                    )}
                    {log.cancelled && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                        <span className="text-orange-600 text-xs">
                          Cancelled:{" "}
                          {log.cancellation_reason || "No reason given"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No SMS records found
              </h3>
              <p className="text-gray-600">
                No SMS logs match your current filters.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
