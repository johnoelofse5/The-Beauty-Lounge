import { EmailTracking, EmailStatus, EmailType } from '../types';

interface EmailLogsTableProps {
  filteredLogs: EmailTracking[];
  totalLogs: number;
  formatDate: (dateString: string) => string;
  formatType: (type: EmailType) => string;
  getStatusColor: (status: EmailStatus) => string;
  getTypeColor: (type: EmailType) => string;
}

export default function EmailLogsTable({
  filteredLogs,
  totalLogs,
  formatDate,
  formatType,
  getStatusColor,
  getTypeColor,
}: EmailLogsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Email Log Records</h3>
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
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.subject ? (
                      <span title={log.subject}>
                        {log.subject.length > 40
                          ? `${log.subject.substring(0, 40)}...`
                          : log.subject}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.email_type)}`}
                    >
                      {formatType(log.email_type)}
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
                    {log.sent_at ? formatDate(log.sent_at) : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.error_message ? (
                      <span className="text-red-600" title={log.error_message}>
                        {log.error_message.length > 40
                          ? `${log.error_message.substring(0, 40)}...`
                          : log.error_message}
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
                  <h4 className="text-sm text-gray-700 truncate">{log.email}</h4>
                  {log.subject && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.subject}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</p>
                </div>
                <div className="flex flex-col space-y-1 ml-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                  >
                    {log.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.email_type)}`}
                  >
                    {formatType(log.email_type)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                {log.sent_at && (
                  <div className="flex justify-between">
                    <span>Sent:</span>
                    <span>{formatDate(log.sent_at)}</span>
                  </div>
                )}
                {log.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <span className="text-red-600 text-xs">{log.error_message}</span>
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email records found</h3>
          <p className="text-gray-600">No email logs match your current filters.</p>
        </div>
      )}
    </div>
  );
}
