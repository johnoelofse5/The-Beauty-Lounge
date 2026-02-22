import { ViewMode } from "@/types"

export interface ViewControlsProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onToday: () => void
  visibleElements: Set<string>
}