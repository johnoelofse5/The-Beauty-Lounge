import { EmailStats } from '../types';

interface EmailStatsCardsProps {
  stats: EmailStats;
}

export default function EmailStatsCards({ stats }: EmailStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        <div className="text-sm text-gray-600">Pending</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
        <div className="text-sm text-gray-600">Sent</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
        <div className="text-sm text-gray-600">Delivered</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        <div className="text-sm text-gray-600">Failed</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-2xl font-bold text-orange-600">{stats.bounced}</div>
        <div className="text-sm text-gray-600">Bounced</div>
      </div>
    </div>
  );
}
