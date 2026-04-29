import { SMSLog, SMSStatus, SMSType } from '../types';

interface SmsLogsTableProps {
  filteredLogs: SMSLog[];
  totalLogs: number;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: SMSStatus) => string;
  getTypeColor: (type: SMSType) => string;
}

export default function SmsLogsTable({
  filteredLogs,
  totalLogs,
  formatDate,
  getStatusColor,
  getTypeColor,
}: SmsLogsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">SMS Log Records</h3>
        <p className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {totalLogs} records
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
                      <span className="text-green-600 font-medium">&#10003; Sent</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.practitioner_sms_sent ? (
                      <span className="text-green-600 font-medium">&#10003; Sent</span>
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
                        className={log.status === 'failed' ? 'text-red-600' : 'text-gray-500'}
                        title={log.reason}
                      >
                        {log.reason.length > 50 ? `${log.reason.substring(0, 50)}...` : log.reason}
                      </span>
                    ) : (
                      '—'
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
            <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-mono text-gray-700 truncate">
                    {String(log.appointment_id).substring(0, 8)}...
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(log.created_at)}</p>
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
                  <span>{log.client_sms_sent ? '✓ Sent' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Practitioner SMS:</span>
                  <span>{log.practitioner_sms_sent ? '✓ Sent' : '—'}</span>
                </div>
                {log.reason && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                    <span
                      className={`text-xs ${log.status === 'failed' ? 'text-red-600' : 'text-gray-600'}`}
                    >
                      {log.reason}
                    </span>
                  </div>
                )}
                {log.cancelled && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <span className="text-orange-600 text-xs">
                      Cancelled: {log.cancellation_reason || 'No reason given'}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS records found</h3>
          <p className="text-gray-600">No SMS logs match your current filters.</p>
        </div>
      )}
    </div>
  );
}
