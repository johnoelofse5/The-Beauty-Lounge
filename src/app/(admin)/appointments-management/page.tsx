'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import { canViewOwnAppointmentsOnly, isPractitioner } from '@/lib/rbac'
import { AppointmentExtended, ViewMode } from '@/types'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import { useAppointments, useInvoiceActions, useModalState } from './hooks/use-appointments'
import { useScrollAnimations } from './hooks/use-scroll-animations'
import ViewControls from './components/view-controls'
import WeekView from './views/week-view'
import DayView from './views/day-view'
import MonthView from './views/month-view'
import CreateAppointmentModal from './components/create-appointment-modal'
import AppointmentDetailModal from './components/appointment-detail-modal'

export default function AppointmentsPage() {
  const { showSuccess, showError } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  const {
    appointments, loading, authLoading, error,
    user, userRoleData, loadAppointments,
    getAppointmentsForDate, getAppointmentsForTimeSlot
  } = useAppointments(currentDate, viewMode)

  const {
    selectedAppointment, showAppointmentModal, isAppointmentModalClosing,
    showEditModal, isEditModalClosing,
    showCreateModal, isCreateModalClosing, selectedCreateDate,
    handleAppointmentClick, closeAppointmentModal,
    openEditModal, closeEditModal, openCreateModal, closeCreateModal
  } = useModalState()

  const { processingInvoiceIds, processingDownloadIds, handleSendInvoice, handleDownloadPDF } =
    useInvoiceActions(appointments, user?.id, showSuccess, showError)

  const { visibleElements } = useScrollAnimations([loading, viewMode, appointments])

  const getDisplayUserInfo = (appointment: AppointmentExtended) => {
    if (!userRoleData?.role) return appointment.client
    if (canViewOwnAppointmentsOnly(userRoleData.role)) return appointment.practitioner
    if (appointment.is_external_client) {
      return {
        first_name: appointment.client_first_name ?? 'Unknown',
        last_name: appointment.client_last_name ?? 'User',
        email: appointment.client_email ?? 'No email',
        phone: appointment.client_phone ?? 'No phone'
      }
    }
    return appointment.client
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(currentDate)
    const delta = direction === 'next' ? 1 : -1
    if (viewMode === 'day') d.setDate(d.getDate() + delta)
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You must be logged in to view appointments.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <ViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={navigateDate}
          onToday={() => setCurrentDate(new Date())}
          visibleElements={visibleElements}
        />

        <div
          data-animate-id="appointments-content"
          style={{
            opacity: visibleElements.has('appointments-content') ? 1 : 0,
            transform: visibleElements.has('appointments-content') ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.7s ease-out'
          }}
        >
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              getAppointmentsForTimeSlot={getAppointmentsForTimeSlot}
              getDisplayUserInfo={getDisplayUserInfo}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              getAppointmentsForDate={getAppointmentsForDate}
              getDisplayUserInfo={getDisplayUserInfo}
              onAppointmentClick={handleAppointmentClick}
              visibleElements={visibleElements}
            />
          )}
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              getAppointmentsForDate={getAppointmentsForDate}
              getDisplayUserInfo={getDisplayUserInfo}
              onAppointmentClick={handleAppointmentClick}
              onDayClick={openCreateModal}
              visibleElements={visibleElements}
            />
          )}
        </div>

        {/* Appointment Detail Modal */}
        {showAppointmentModal && selectedAppointment && (
          <AppointmentDetailModal
            appointment={selectedAppointment}
            isClosing={isAppointmentModalClosing}
            userRoleData={userRoleData}
            processingInvoiceIds={processingInvoiceIds}
            processingDownloadIds={processingDownloadIds}
            onClose={closeAppointmentModal}
            onEdit={openEditModal}
            onSendInvoice={handleSendInvoice}
            onDownloadPDF={handleDownloadPDF}
          />
        )}

        {/* Edit Modal */}
        {showEditModal && selectedAppointment && userRoleData && (
          <EditAppointmentModal
            appointment={selectedAppointment}
            isClosing={isEditModalClosing}
            onClose={closeEditModal}
            onUpdate={loadAppointments}
            userRoleData={userRoleData}
          />
        )}

        {/* Create Modal */}
        {showCreateModal && selectedCreateDate && (
          <CreateAppointmentModal
            selectedDate={selectedCreateDate}
            isClosing={isCreateModalClosing}
            onClose={closeCreateModal}
            onUpdate={loadAppointments}
            userRoleData={userRoleData}
          />
        )}
      </main>
    </div>
  )
}