import { SMSStats } from '../types';

interface SmsStatsCardsProps {
  stats: SMSStats;
}

export default function SmsStatsCards({ stats }: SmsStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
        <div className="text-sm text-gray-600">Sent</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-yellow-600">{stats.suppressed}</div>
        <div className="text-sm text-gray-600">Suppressed</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        <div className="text-sm text-gray-600">Failed</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
        <div className="text-sm text-gray-600">Scheduled</div>
      </div>
    </div>
  );
}
