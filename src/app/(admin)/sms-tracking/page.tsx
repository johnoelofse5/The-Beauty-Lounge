'use client';

import { useSmsTracking } from './hooks/use-sms-tracking';
import StatsCards from './components/stats-cards';
import SmsFilters from './components/sms-filters';
import SmsLogsTable from './components/sms-logs-table';

export default function SmsTrackingPage() {
  const {
    loading,
    error,
    stats,
    smsLogs,
    filteredLogs,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    statusOptions,
    typeOptions,
    formatDate,
    getStatusColor,
    getTypeColor,
  } = useSmsTracking();

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

        <StatsCards stats={stats} />

        <SmsFilters
          filterStatus={filterStatus}
          filterType={filterType}
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          onStatusChange={setFilterStatus}
          onTypeChange={setFilterType}
        />

        <SmsLogsTable
          filteredLogs={filteredLogs}
          totalLogs={smsLogs.length}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
        />
      </main>
    </div>
  );
}
