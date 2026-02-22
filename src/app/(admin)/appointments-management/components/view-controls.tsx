import { ViewMode } from "@/types"
import { ViewControlsProps } from "../types/view-control-props"

export default function ViewControls({
  viewMode,
  onViewModeChange,
  onNavigate,
  onToday,
  visibleElements
}: ViewControlsProps) {
  const modes: ViewMode[] = ['day', 'week', 'month']

  const NavArrow = ({ direction }: { direction: 'prev' | 'next' }) => (
    <button
      onClick={() => onNavigate(direction)}
      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )

  const ModeToggle = ({ compact }: { compact?: boolean }) => (
    <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
      {modes.map(mode => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`${compact ? 'flex-1' : ''} px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === mode
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  )

  return (
    <div
      className="mb-8 transition-all duration-700 ease-out"
      data-animate-id="view-controls"
      style={{
        opacity: visibleElements.has('view-controls') ? 1 : 0,
        transform: visibleElements.has('view-controls') ? 'translateY(0)' : 'translateY(30px)'
      }}
    >
      {/* Mobile */}
      <div className="flex flex-col space-y-4 md:hidden">
        <ModeToggle compact />
        <div className="flex items-center justify-between">
          <NavArrow direction="prev" />
          <button
            onClick={onToday}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Today
          </button>
          <NavArrow direction="next" />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <ModeToggle />
        <div className="flex items-center space-x-4">
          <NavArrow direction="prev" />
          <button
            onClick={onToday}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Today
          </button>
          <NavArrow direction="next" />
        </div>
      </div>
    </div>
  )
}