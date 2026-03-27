import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import { AnalyticsViewMode, PeakHourDataPoint } from '../types';

interface PeakHoursChartProps {
  data: PeakHourDataPoint[];
  loading: boolean;
  viewMode: AnalyticsViewMode;
  selectedDate: Date;
}

export default function PeakHoursChart({
  data,
  loading,
  viewMode,
  selectedDate,
}: PeakHoursChartProps) {
  const periodLabel =
    viewMode === 'month'
      ? selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : selectedDate.getFullYear().toString();

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2C7EB]">
          <Clock className="h-4 w-4 text-gray-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Peak Hours</h2>
          <p className="text-sm text-gray-500">Busiest times of day in {periodLabel}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F2C7EB]" />
        </div>
      ) : (
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f9f0f7' }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#111827',
                  fontSize: '13px',
                }}
                formatter={(value) => [value ?? 0, 'Appointments']}
              />
              <Bar dataKey="appointments" fill="#F2C7EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
