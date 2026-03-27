import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DollarSign } from 'lucide-react';
import { RevenueDataPoint } from '../types';

interface RevenueTrendChartProps {
  data: RevenueDataPoint[];
  loading: boolean;
  selectedDate: Date;
}

function formatCurrency(value: number) {
  return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6">
          <span style={{ color: entry.color }} className="font-medium">
            {entry.name}
          </span>
          <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueTrendChart({ data, loading, selectedDate }: RevenueTrendChartProps) {
  const year = selectedDate.getFullYear();

  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const totalNet = totalIncome - totalExpenses;
  const profitableMonths = data.filter((d) => d.net > 0).length;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2C7EB]">
            <DollarSign className="h-4 w-4 text-gray-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Revenue Growth</h2>
            <p className="text-sm text-gray-500">Income vs expenses across {year}</p>
          </div>
        </div>

        {/* Year summary pills */}
        {!loading && (
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              {formatCurrency(totalIncome)} income
            </span>
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              {formatCurrency(totalExpenses)} expenses
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                totalNet >= 0 ? 'bg-[#F2C7EB] text-gray-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {totalNet >= 0 ? '+' : ''}
              {formatCurrency(totalNet)} net · {profitableMonths}/12 months profitable
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F2C7EB]" />
        </div>
      ) : (
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#4ade80' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f87171"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f87171' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net profit"
                stroke="#F2C7EB"
                strokeWidth={2.5}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#F2C7EB' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
