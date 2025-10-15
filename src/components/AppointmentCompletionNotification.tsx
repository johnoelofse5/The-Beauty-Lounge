'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, User, Calendar, Phone, Mail, Receipt } from 'lucide-react'
import { AppointmentCompletionNotificationProps, CompletedAppointment } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { AppointmentCompletionService } from '@/lib/appointment-completion-service'
import { isPractitioner, isSuperAdmin } from '@/lib/rbac'
import { useAuth } from '@/contexts/AuthContext'
import { InvoiceService } from '@/lib/invoice-service'
import { InvoiceSMSService } from '@/lib/invoice-sms-service'

export default function AppointmentCompletionNotification({ onClose }: AppointmentCompletionNotificationProps) {
  const [appointments, setAppointments] = useState<CompletedAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const { showSuccess, showError } = useToast()
  const { userRoleData } = useAuth()

  const loadCompletedAppointments = async () => {
    try {
      setLoading(true)
      const data = await AppointmentCompletionService.getAppointmentsNeedingCompletion()
      setAppointments(data)
    } catch (error) {
      console.error('Error loading completed appointments:', error)
      showError('Failed to load completed appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompletedAppointments()
  }, [])

  const canAccessNotification = userRoleData?.role && (isPractitioner(userRoleData.role) || isSuperAdmin(userRoleData.role))
  
  if (!canAccessNotification) {
    return null
  }

  const handleMarkCompleted = async (appointmentId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(appointmentId))
      await AppointmentCompletionService.markAsCompleted(appointmentId)
      
      
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
      showSuccess('Appointment marked as completed')
    } catch (error) {
      console.error('Error marking appointment as completed:', error)
      showError('Failed to mark appointment as completed')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleMarkCancelled = async (appointmentId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(appointmentId))
      await AppointmentCompletionService.markAsCancelled(appointmentId)
      
      
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
      showSuccess('Appointment marked as cancelled')
    } catch (error) {
      console.error('Error marking appointment as cancelled:', error)
      showError('Failed to mark appointment as cancelled')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  const handleSendInvoice = async (appointmentId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(appointmentId))
      
      const invoiceStatus = await InvoiceSMSService.getInvoiceStatus(appointmentId)
      if (invoiceStatus.data?.invoice_exists) {
        showError('Invoice already sent for this appointment')
        return
      }

      const result = await InvoiceSMSService.sendInvoiceSMS(appointmentId)

      if (result.success) {
        showSuccess('Invoice sent successfully via SMS!')
      } else {
        showError(`Failed to send invoice: ${result.message}`)
      }
    } catch (error) {
      showError('Failed to send invoice')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md bg-white">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Loading completed appointments...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (appointments.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-orange-900">
                  Appointment Completed
                </CardTitle>
                <CardDescription className="text-xs text-orange-700">
                  Please confirm the completion status
                </CardDescription>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                {appointment.status}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Appointment Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {AppointmentCompletionService.formatAppointmentDateTime(appointment)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>{AppointmentCompletionService.formatClientName(appointment)}</span>
              </div>
              
              {appointment.client_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-xs">{appointment.client_email}</span>
                </div>
              )}
              
              {appointment.client_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-xs">{appointment.client_phone}</span>
                </div>
              )}
              
              <div className="text-xs text-gray-600">
                <strong>Services:</strong> {AppointmentCompletionService.formatServices(appointment)}
              </div>
              
              {appointment.notes && (
                <div className="text-xs text-gray-600">
                  <strong>Notes:</strong> {appointment.notes}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleMarkCompleted(appointment.id)}
                  disabled={processingIds.has(appointment.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completed
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleMarkCancelled(appointment.id)}
                  disabled={processingIds.has(appointment.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelled
                </Button>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => handleSendInvoice(appointment.id)}
                disabled={processingIds.has(appointment.id)}
              >
                <Receipt className="h-4 w-4 mr-1" />
                Send Invoice via SMS
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
