import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnalyticsViewMode } from '../types';

interface PeriodNavigatorProps {
  viewMode: AnalyticsViewMode;
  selectedDate: Date;
  totalCount: number;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function PeriodNavigator({
  viewMode,
  selectedDate,
  totalCount,
  onNavigate,
}: PeriodNavigatorProps) {
  const periodLabel =
    viewMode === 'month'
      ? selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : selectedDate.getFullYear().toString();

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onNavigate('prev')}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600" />
      </button>

      <div className="text-center">
        <p className="text-xl font-semibold text-gray-900">{periodLabel}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalCount} appointment{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <button
        onClick={() => onNavigate('next')}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
