import { AppointmentExtended } from '@/types'
import { formatDateForAPI, formatTime, getTotalPrice } from '../utils/appointment-formatters';
import { formatPrice } from '@/lib/services';

interface DayViewProps {
  currentDate: Date
  getAppointmentsForTimeSlot: (date: string, hour: number) => AppointmentExtended[]
  getDisplayUserInfo: (appointment: AppointmentExtended) => { first_name?: string; last_name?: string } | null
  onAppointmentClick: (appointment: AppointmentExtended) => void
}

export default function DayView({
  currentDate,
  getAppointmentsForTimeSlot,
  getDisplayUserInfo,
  onAppointmentClick
}: DayViewProps) {
  const dateStr = formatDateForAPI(currentDate)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
          const hourAppointments = getAppointmentsForTimeSlot(dateStr, hour)

          return (
            <div key={hour} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatTime(`${hour.toString().padStart(2, '0')}:00:00`)}
                </h3>
                <span className="text-sm text-gray-500">
                  {hourAppointments.length} appointment{hourAppointments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {hourAppointments.length === 0 ? (
                <p className="text-gray-500 text-sm">No appointments</p>
              ) : (
                <div className="space-y-2">
                  {hourAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => onAppointmentClick(appointment)}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getDisplayUserInfo(appointment)?.first_name ?? 'Unknown'}{' '}
                            {getDisplayUserInfo(appointment)?.last_name ?? 'User'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {appointment.services?.map(s => s.name).join(', ') || 'Service'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(getTotalPrice(appointment.services || []))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}