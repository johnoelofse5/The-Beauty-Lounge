type TabKey = 'dashboard' | 'inventory' | 'service-inventory' | 'finances'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'service-inventory', label: 'Service Inventory', icon: '🔗' },
  { key: 'finances', label: 'Financial Transactions', icon: '💰' }
]

interface Props {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

export default function TabNavigation({ activeTab, onChange }: Props) {
  return (
    <div className="border-b border-gray-200">
      {/* Desktop */}
      <nav className="hidden sm:flex -mb-px space-x-8">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`${
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile - horizontal scroll */}
      <div className="sm:hidden -mb-px overflow-x-auto scrollbar-hide">
        <nav className="flex space-x-1 min-w-max px-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              } flex-shrink-0 py-3 px-4 border-b-2 font-medium text-sm flex flex-col items-center space-y-1 min-w-[120px] rounded-t-lg transition-all duration-200`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs leading-tight text-center">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export type { TabKey }