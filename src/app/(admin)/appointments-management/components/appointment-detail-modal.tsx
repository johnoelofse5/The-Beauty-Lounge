import { AppointmentExtended } from '@/types'
import { isPractitioner, canViewOwnAppointmentsOnly } from '@/lib/rbac'
import { StatusBadge } from './appointment-card'
import { formatDate, formatPrice, formatTime } from '../utils/appointment-formatters'

interface Props {
  appointment: AppointmentExtended
  isClosing: boolean
  userRoleData: any
  processingInvoiceIds: Set<string>
  processingDownloadIds: Set<string>
  onClose: () => void
  onEdit: () => void
  onSendInvoice: (id: string) => void
  onDownloadPDF: (id: string) => void
}

export default function AppointmentDetailModal({
  appointment,
  isClosing,
  userRoleData,
  processingInvoiceIds,
  processingDownloadIds,
  onClose,
  onEdit,
  onSendInvoice,
  onDownloadPDF
}: Props) {
  const isClient = userRoleData?.role && canViewOwnAppointmentsOnly(userRoleData.role)
  const isPract = userRoleData?.role && isPractitioner(userRoleData.role)
  const isAdmin = userRoleData?.role?.name === 'super_admin'

  const canEdit =
    appointment.status === 'scheduled' &&
    ((isClient && appointment.user_id === userRoleData?.user?.id) ||
      (isPract && appointment.practitioner_id === userRoleData?.user?.id))

  const canInvoice =
    appointment.status === 'completed' && (isPract || isAdmin)

  const clientName = appointment.is_external_client
    ? `${appointment.client_first_name ?? 'Unknown'} ${appointment.client_last_name ?? 'User'}`
    : `${appointment.client?.first_name ?? 'Unknown'} ${appointment.client?.last_name ?? 'User'}`

  const clientEmail = appointment.is_external_client
    ? (appointment.client_email ?? 'No email')
    : (appointment.client?.email ?? 'No email')

  const clientPhone = appointment.is_external_client
    ? (appointment.client_phone ?? 'No phone')
    : (appointment.client?.phone ?? 'No phone')

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:right-auto lg:w-full lg:max-w-2xl bg-white rounded-t-xl lg:rounded-xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[95vh] lg:max-h-[90vh] flex flex-col pointer-events-auto ${
        isClosing
          ? 'translate-y-full lg:translate-y-full lg:translate-x-[-50%]'
          : 'translate-y-0 lg:translate-x-[-50%] lg:translate-y-[-50%]'
      }`}>
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Client info */}
          <section>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              {isClient ? 'Your Practitioner' : 'Client Information'}
            </h4>
            <div className={`rounded-lg p-4 border ${isClient ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isClient ? (
                  <>
                    <InfoField label="Name" value={`${appointment.practitioner?.first_name ?? 'Unknown'} ${appointment.practitioner?.last_name ?? 'User'}`} />
                    <InfoField label="Email" value={appointment.practitioner?.email ?? 'No email'} />
                    <InfoField label="Phone" value={appointment.practitioner?.phone ?? 'No phone'} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-gray-900">
                        {clientName}
                        {appointment.is_external_client && (
                          <span className="text-xs text-gray-500 ml-2">(External Client)</span>
                        )}
                      </p>
                    </div>
                    <InfoField label="Email" value={clientEmail} />
                    <InfoField label="Phone" value={clientPhone} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Practitioner info (for non-client views) */}
          {!isClient && (
            <section>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Practitioner Information</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label="Name" value={`${appointment.practitioner?.first_name ?? 'Unknown'} ${appointment.practitioner?.last_name ?? 'User'}`} />
                  <InfoField label="Email" value={appointment.practitioner?.email ?? 'No email'} />
                  <InfoField label="Phone" value={appointment.practitioner?.phone ?? 'No phone'} />
                </div>
              </div>
            </section>
          )}

          {/* Client's own info (for client view) */}
          {isClient && (
            <section>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Information</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-gray-900">
                      {clientName}
                      {appointment.is_external_client && (
                        <span className="text-xs text-gray-500 ml-2">(External Client)</span>
                      )}
                    </p>
                  </div>
                  <InfoField label="Email" value={clientEmail} />
                  <InfoField label="Phone" value={clientPhone} />
                </div>
              </div>
            </section>
          )}

          {/* Services */}
          {appointment.services && appointment.services.length > 0 && (
            <section>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Services</h4>
              <div className="space-y-3">
                {appointment.services.map(service => (
                  <div key={service.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{service.name}</h5>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">Duration: {service.duration_minutes}min</span>
                          <span className="text-sm text-gray-500">Price: {formatPrice(service.price ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Date & Time */}
          <section>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Date & Time</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField label="Date" value={formatDate(appointment.appointment_date)} />
                <InfoField label="Time" value={`${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`} />
              </div>
            </div>
          </section>

          {/* Notes */}
          {appointment.notes && (
            <section>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900">{appointment.notes}</p>
              </div>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="space-y-3">
            {canInvoice && (
              <>
                <LoadingButton
                  loading={processingInvoiceIds.has(appointment.id)}
                  onClick={() => onSendInvoice(appointment.id)}
                  colour="green"
                  label="Send Invoice via Email"
                  loadingLabel="Sending Invoice..."
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                />
                <LoadingButton
                  loading={processingDownloadIds.has(appointment.id)}
                  onClick={() => onDownloadPDF(appointment.id)}
                  colour="blue"
                  label="Download PDF"
                  loadingLabel="Generating PDF..."
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                />
              </>
            )}

            <div className="flex space-x-3">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base"
                >
                  Edit Appointment
                </button>
              )}
              <button
                onClick={onClose}
                className={`${canEdit ? 'flex-1' : 'w-full'} bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm lg:text-base`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

//#region Local helpers
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  )
}

function LoadingButton({
  loading,
  onClick,
  colour,
  label,
  loadingLabel,
  icon
}: {
  loading: boolean
  onClick: () => void
  colour: 'green' | 'blue'
  label: string
  loadingLabel: string
  icon: React.ReactNode
}) {
  const colours = {
    green: 'bg-green-600 hover:bg-green-700',
    blue: 'bg-blue-600 hover:bg-blue-700'
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full ${colours[colour]} text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
          <span>{label}</span>
        </>
      )}
    </button>
  )
}
//#endregion