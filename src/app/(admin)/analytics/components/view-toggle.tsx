import { AnalyticsViewMode } from '../types';

interface ViewToggleProps {
  viewMode: AnalyticsViewMode;
  onChange: (mode: AnalyticsViewMode) => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  const btn = (mode: AnalyticsViewMode, label: string) => (
    <button
      key={mode}
      onClick={() => onChange(mode)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        viewMode === mode
          ? 'bg-[#F2C7EB] text-gray-900'
          : 'bg-gray-100 text-gray-500 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      {btn('month', 'Month')}
      {btn('year', 'Year')}
    </div>
  );
}
