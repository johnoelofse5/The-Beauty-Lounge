import { Sparkles } from 'lucide-react';
import { AnalyticsViewMode, ServicePopularity } from '../types';

interface PopularServicesProps {
  services: ServicePopularity[];
  loading: boolean;
  viewMode: AnalyticsViewMode;
  selectedDate: Date;
}

export default function PopularServices({
  services,
  loading,
  viewMode,
  selectedDate,
}: PopularServicesProps) {
  const periodLabel =
    viewMode === 'month'
      ? selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : selectedDate.getFullYear().toString();

  const max = services[0]?.count ?? 1;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2C7EB]">
          <Sparkles className="h-4 w-4 text-gray-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Popular Services</h2>
          <p className="text-sm text-gray-500">Most booked services in {periodLabel}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F2C7EB]" />
        </div>
      ) : services.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No appointment data for this period.
        </p>
      ) : (
        <ol className="space-y-4">
          {services.map((service, index) => (
            <li key={service.serviceId} className="flex items-center gap-4">
              {/* Rank badge */}
              <span
                className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-[#F2C7EB] text-gray-900' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index + 1}
              </span>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">{service.name}</span>
                  <span className="ml-3 flex-shrink-0 text-sm font-semibold text-gray-700">
                    {service.count} booking{service.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-[#F2C7EB] transition-all duration-500"
                    style={{ width: `${(service.count / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
