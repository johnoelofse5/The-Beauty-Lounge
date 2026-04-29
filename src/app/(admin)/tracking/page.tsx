'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSmsTracking } from './hooks/use-sms-tracking';
import { useEmailTracking } from './hooks/use-email-tracking';
import SmsStatsCards from './components/sms-stats-cards';
import SmsFilters from './components/sms-filters';
import SmsLogsTable from './components/sms-logs-table';
import EmailStatsCards from './components/email-stats-cards';
import EmailFilters from './components/email-filters';
import EmailLogsTable from './components/email-logs-table';

type TabKey = 'sms' | 'email';

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('sms');

  const sms = useSmsTracking();
  const email = useEmailTracking();

  const loading = activeTab === 'sms' ? sms.loading : email.loading;
  const error = activeTab === 'sms' ? sms.error : email.error;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading logs...</p>
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="mb-6 gap-1.5 p-1.5 h-auto">
            <TabsTrigger value="sms" className="px-5 py-4 text-base">
              SMS Logs
            </TabsTrigger>
            <TabsTrigger value="email" className="px-5 py-4 text-base">
              Email Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms">
            <SmsStatsCards stats={sms.stats} />
            <SmsFilters
              filterStatus={sms.filterStatus}
              filterType={sms.filterType}
              statusOptions={sms.statusOptions}
              typeOptions={sms.typeOptions}
              onStatusChange={sms.setFilterStatus}
              onTypeChange={sms.setFilterType}
            />
            <SmsLogsTable
              filteredLogs={sms.filteredLogs}
              totalLogs={sms.smsLogs.length}
              formatDate={sms.formatDate}
              getStatusColor={sms.getStatusColor}
              getTypeColor={sms.getTypeColor}
            />
          </TabsContent>

          <TabsContent value="email">
            <EmailStatsCards stats={email.stats} />
            <EmailFilters
              filterStatus={email.filterStatus}
              filterType={email.filterType}
              statusOptions={email.statusOptions}
              typeOptions={email.typeOptions}
              onStatusChange={email.setFilterStatus}
              onTypeChange={email.setFilterType}
              formatType={email.formatType}
            />
            <EmailLogsTable
              filteredLogs={email.filteredLogs}
              totalLogs={email.emailLogs.length}
              formatDate={email.formatDate}
              formatType={email.formatType}
              getStatusColor={email.getStatusColor}
              getTypeColor={email.getTypeColor}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
