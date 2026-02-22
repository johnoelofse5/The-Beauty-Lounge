import { AppointmentExtended } from '@/types'
import { formatTime } from '../utils/appointment-formatters';

interface AppointmentCardProps {
  appointment: AppointmentExtended
  displayName: { first_name?: string; last_name?: string } | null
  onClick: (appointment: AppointmentExtended) => void
  animateId?: string
  animationStyle?: React.CSSProperties
  compact?: boolean
}

export function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    scheduled: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export default function AppointmentCard({
  appointment,
  displayName,
  onClick,
  animateId,
  animationStyle,
  compact = false
}: AppointmentCardProps) {
  const name = `${displayName?.first_name ?? 'Unknown'} ${displayName?.last_name ?? 'User'}`
  const timeRange = `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`

  if (compact) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(appointment) }}
        className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
      >
        {formatTime(appointment.start_time)} {displayName?.first_name ?? 'Unknown'}
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick(appointment)}
      data-animate-id={animateId}
      style={animationStyle}
      className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <h4 className="font-medium text-gray-900">{name}</h4>
        </div>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">{timeRange}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <StatusBadge status={appointment.status} />
        {appointment.services && appointment.services.length > 0 && (
          <span className="text-xs text-gray-500">
            {appointment.services.length} service{appointment.services.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}