import { Calendar, TrendingUp, Sparkles, XCircle } from 'lucide-react';
import { AnalyticsViewMode, ChartDataPoint, ServicePopularity } from '../types';
import { computeSummary, buildSummaryText } from '../utils/analytics-utils';

interface SummaryCardProps {
  data: ChartDataPoint[];
  totalCount: number;
  cancelledCount: number;
  cancellationRate: number;
  viewMode: AnalyticsViewMode;
  selectedDate: Date;
  topServices: ServicePopularity[];
  servicesLoading: boolean;
}

export default function SummaryCard({
  data,
  totalCount,
  cancelledCount,
  cancellationRate,
  viewMode,
  selectedDate,
  topServices,
  servicesLoading,
}: SummaryCardProps) {
  const summary = computeSummary(data, totalCount, viewMode, selectedDate);
  const summaryText = buildSummaryText(summary, viewMode);
  const unit = viewMode === 'month' ? 'day' : 'month';
  const topService = topServices[0];

  const stats = [
    {
      icon: Sparkles,
      label: 'Top service',
      value: servicesLoading ? '…' : topService ? topService.name : '—',
      sub: servicesLoading
        ? ''
        : topService
          ? `${topService.count} booking${topService.count !== 1 ? 's' : ''}`
          : 'no data',
    },
    {
      icon: Calendar,
      label: 'Total',
      value: summary.total,
      sub: viewMode === 'month' ? 'this month' : 'this year',
    },
    {
      icon: TrendingUp,
      label: `Avg / active ${unit}`,
      value: summary.average,
      sub: `across active ${unit}s only`,
    },
    {
      icon: XCircle,
      label: 'Cancellation rate',
      value: `${cancellationRate}%`,
      sub: `${cancelledCount} cancelled or no-show`,
    },
  ];

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2C7EB]">
              <Icon className="h-4 w-4 text-gray-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight truncate">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100" />

      <p className="text-sm text-gray-600 leading-relaxed">{summaryText}</p>
    </div>
  );
}
