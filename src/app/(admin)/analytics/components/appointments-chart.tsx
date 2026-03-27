import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyticsViewMode, ChartDataPoint } from '../types';

interface AppointmentsChartProps {
  data: ChartDataPoint[];
  viewMode: AnalyticsViewMode;
}

export default function AppointmentsChart({ data, viewMode }: AppointmentsChartProps) {
  return (
    <div className="h-64 sm:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval={viewMode === 'month' ? 4 : 0}
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
            formatter={(value) => [value as number, 'Appointments']}
          />
          <Bar
            dataKey="appointments"
            fill="#F2C7EB"
            radius={[4, 4, 0, 0]}
            maxBarSize={viewMode === 'year' ? 56 : 28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
