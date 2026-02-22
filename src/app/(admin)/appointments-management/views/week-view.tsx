import { AppointmentExtended } from '@/types'
import { formatDateForAPI } from '../utils/appointment-formatters';
import AppointmentCard from '../components/appointment-card';

interface WeekViewProps {
  currentDate: Date
  getAppointmentsForDate: (date: string) => AppointmentExtended[]
  getDisplayUserInfo: (appointment: AppointmentExtended) => { first_name?: string; last_name?: string } | null
  onAppointmentClick: (appointment: AppointmentExtended) => void
  visibleElements: Set<string>
}

export default function WeekView({
  currentDate,
  getAppointmentsForDate,
  getDisplayUserInfo,
  onAppointmentClick,
  visibleElements
}: WeekViewProps) {
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    return date
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h2>
      </div>

      <div className="space-y-4">
        {weekDays.map((day, dayIndex) => {
          const dateStr = formatDateForAPI(day)
          const dayAppointments = getAppointmentsForDate(dateStr)
          const isToday = day.toDateString() === new Date().toDateString()

          return (
            <div
              key={dayIndex}
              className={`bg-white rounded-lg border p-4 ${isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
              data-animate-id={`week-day-${dayIndex}`}
              style={{
                opacity: visibleElements.has(`week-day-${dayIndex}`) ? 1 : 0,
                transform: visibleElements.has(`week-day-${dayIndex}`) ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease-out ${dayIndex * 0.1}s`
              }}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="text-sm font-semibold">{day.getDate()}</span>
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'long' })}
                    </h3>
                    <p className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                      {day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Appointments */}
              <div className="space-y-3">
                {dayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No appointments scheduled</p>
                  </div>
                ) : (
                  dayAppointments.map((appointment, appointmentIndex) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      displayName={getDisplayUserInfo(appointment)}
                      onClick={onAppointmentClick}
                      animateId={`week-appointment-${appointment.id}`}
                      animationStyle={{
                        opacity: visibleElements.has(`week-appointment-${appointment.id}`) ? 1 : 0,
                        transform: visibleElements.has(`week-appointment-${appointment.id}`) ? 'translateY(0)' : 'translateY(20px)',
                        transition: `all 0.5s ease-out ${(dayIndex * 0.1) + (appointmentIndex * 0.05)}s`
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}