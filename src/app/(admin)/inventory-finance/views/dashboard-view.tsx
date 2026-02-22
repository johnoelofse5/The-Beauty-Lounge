import { InventorySummary, FinancialSummary, LowStockItem } from '@/types/inventory'
import { formatCurrency } from '../utils/inventory-formatter'

interface Props {
  inventorySummary: InventorySummary | null
  financialSummary: FinancialSummary | null
  lowStockItems: LowStockItem[]
  loading: boolean
}

export default function DashboardView({ inventorySummary, financialSummary, lowStockItems, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <SummaryCards inventorySummary={inventorySummary} financialSummary={financialSummary} />
      {lowStockItems.length > 0 && <LowStockTable items={lowStockItems} />}
      <FinancialOverview financialSummary={financialSummary} />
    </div>
  )
}

//#region Sub-components
function SummaryCards({ inventorySummary, financialSummary }: Pick<Props, 'inventorySummary' | 'financialSummary'>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard
        icon={<BoxIcon />}
        colour="blue"
        label="Inventory Value"
        value={formatCurrency(inventorySummary?.total_value || 0)}
        sub={`${inventorySummary?.total_items || 0} items in stock`}
      />
      <StatCard
        icon={<MoneyIcon />}
        colour="green"
        label="Monthly Revenue"
        value={formatCurrency(financialSummary?.monthly_revenue || 0)}
        sub={`Profit: ${formatCurrency(financialSummary?.monthly_profit || 0)}`}
      />
      <StatCard
        icon={<WalletIcon />}
        colour="red"
        label="Monthly Expenses"
        value={formatCurrency(financialSummary?.monthly_expenses || 0)}
      />
      <StatCard
        icon={<WarningIcon />}
        colour="yellow"
        label="Low Stock Items"
        value={String(inventorySummary?.low_stock_items || 0)}
        sub={`${inventorySummary?.categories_count || 0} categories`}
      />
    </div>
  )
}

function LowStockTable({ items }: { items: LowStockItem[] }) {
  const badge = (item: LowStockItem) =>
    item.current_stock === 0
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800'
  const label = (item: LowStockItem) => item.current_stock === 0 ? 'Out of Stock' : 'Low Stock'

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Low Stock Alert</h3>
        <p className="text-xs sm:text-sm text-gray-600">Items that need restocking</p>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-200">
        {items.map(item => (
          <div key={item.item_id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 truncate pr-2">{item.item_name}</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${badge(item)}`}>
                {label(item)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current Stock</p>
                <p className="text-sm font-medium text-gray-900">{item.current_stock}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Minimum Stock</p>
                <p className="text-sm font-medium text-gray-900">{item.minimum_stock}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block p-4 sm:p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Item Name', 'Current Stock', 'Minimum Stock', 'Status'].map(h => (
                <th key={h} className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.item_id}>
                <td className="px-4 lg:px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">{item.current_stock}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">{item.minimum_stock}</td>
                <td className="px-4 lg:px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge(item)}`}>
                    {label(item)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FinancialOverview({ financialSummary }: { financialSummary: FinancialSummary | null }) {
  const periods = [
    { label: 'Monthly Financial Overview', revenue: financialSummary?.monthly_revenue || 0, expenses: financialSummary?.monthly_expenses || 0, profit: financialSummary?.monthly_profit || 0 },
    { label: 'Yearly Financial Overview', revenue: financialSummary?.yearly_revenue || 0, expenses: financialSummary?.yearly_expenses || 0, profit: financialSummary?.yearly_profit || 0 }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {periods.map(p => (
        <div key={p.label} className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">{p.label}</h3>
          </div>
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
              <span className="text-xs sm:text-sm font-medium text-green-600">{formatCurrency(p.revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Expenses</span>
              <span className="text-xs sm:text-sm font-medium text-red-600">{formatCurrency(p.expenses)}</span>
            </div>
            <div className="border-t pt-3 sm:pt-4 flex justify-between items-center">
              <span className="text-sm sm:text-base font-medium text-gray-900">Net Profit</span>
              <span className={`text-sm sm:text-base font-medium ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(p.profit)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

//#endregion

//#region Icon helpers
function StatCard({ icon, colour, label, value, sub }: { icon: React.ReactNode; colour: string; label: string; value: string; sub?: string }) {
  const bg: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', red: 'bg-red-100 text-red-600', yellow: 'bg-yellow-100 text-yellow-600' }
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${bg[colour]}`}>{icon}</div>
        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{label}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
      {sub && <div className="mt-3 sm:mt-4"><p className="text-xs sm:text-sm text-gray-600">{sub}</p></div>}
    </div>
  )
}

const iconCls = 'h-5 w-5 sm:h-6 sm:w-6'
const BoxIcon = () => <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
const MoneyIcon = () => <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
const WalletIcon = () => <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
const WarningIcon = () => <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" /></svg>

//#endregion