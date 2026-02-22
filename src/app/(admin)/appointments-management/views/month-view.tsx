import { AppointmentExtended } from '@/types'
import { formatDateForAPI, formatTime } from '../utils/appointment-formatters';
import AppointmentCard from '../components/appointment-card';

interface MonthViewProps {
  currentDate: Date
  getAppointmentsForDate: (date: string) => AppointmentExtended[]
  getDisplayUserInfo: (appointment: AppointmentExtended) => { first_name?: string; last_name?: string } | null
  onAppointmentClick: (appointment: AppointmentExtended) => void
  onDayClick: (date: Date) => void
  visibleElements: Set<string>
}

export default function MonthView({
  currentDate,
  getAppointmentsForDate,
  getDisplayUserInfo,
  onAppointmentClick,
  onDayClick,
  visibleElements
}: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(gridStart.getDate() - firstDay.getDay())

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const currentMonthDaysWithAppointments = days
    .filter(d => d.getMonth() === month)
    .map(date => ({
      date,
      appointments: getAppointmentsForDate(formatDateForAPI(date))
    }))
    .filter(({ appointments }) => appointments.length > 0)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {/* ── Desktop: Calendar Grid ── */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-3 text-center font-semibold text-gray-700">{d}</div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dateStr = formatDateForAPI(day)
              const dayAppointments = getAppointmentsForDate(dateStr)
              const isCurrentMonth = day.getMonth() === month
              const isToday = day.toDateString() === new Date().toDateString()

              return (
                <div
                  key={index}
                  onClick={() => isCurrentMonth && onDayClick(day)}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                    isCurrentMonth ? 'bg-white cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    } ${isToday ? 'text-blue-600' : ''}`}>
                      {day.getDate()}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(appointment) }}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
                      >
                        {formatTime(appointment.start_time)} {getDisplayUserInfo(appointment)?.first_name ?? 'Unknown'}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500">+{dayAppointments.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile: List View ── */}
      <div className="lg:hidden">
        {currentMonthDaysWithAppointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments this month</h3>
            <p className="text-gray-500">
              All appointments for{' '}
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}{' '}
              will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentMonthDaysWithAppointments.map(({ date, appointments }) => {
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => onDayClick(date)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h3>
                      {isToday && <span className="text-sm text-blue-600 font-medium">Today</span>}
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {appointments.map((appointment, index) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        displayName={getDisplayUserInfo(appointment)}
                        onClick={onAppointmentClick}
                        animateId={`appointment-${appointment.id}`}
                        animationStyle={{
                          opacity: visibleElements.has(`appointment-${appointment.id}`) ? 1 : 0,
                          transform: visibleElements.has(`appointment-${appointment.id}`) ? 'translateY(0)' : 'translateY(30px)',
                          transition: `all 0.6s ease-out ${index * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}