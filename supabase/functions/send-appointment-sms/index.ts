import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AppointmentSMSData {
  appointment_id: string
  sms_type: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder'
  client_phone: string
  practitioner_phone: string
  client_name: string
  practitioner_name: string
  service_name: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
}

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    
    const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID')
    const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!bulksmsTokenId || !bulksmsTokenSecret) {
      throw new Error('Missing BulkSMS configuration')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    
    const { 
      appointment_id, 
      sms_type = 'confirmation',
      send_client_sms = true 
    } = await req.json()
    
    const normalizedSmsType = String(sms_type || 'confirmation').toLowerCase()

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Appointment ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    
    const validSmsTypes = ['confirmation', 'reschedule', 'cancellation', 'reminder']
    if (!validSmsTypes.includes(normalizedSmsType)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid SMS type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        user_id,
        practitioner_id,
        service_ids,
        client_first_name,
        client_last_name,
        client_phone,
        is_external_client,
        clients:user_id (
          id,
          first_name,
          last_name,
          phone
        ),
        practitioners:practitioner_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', appointment_id)
      .single()

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }

    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name')
      .in('id', appointment.service_ids || [])

    if (servicesError) {
      throw new Error('Failed to fetch service details')
    }

    const serviceNames = services?.map(s => s.name).join(', ') || 'Service'

    
    const startTime = new Date(appointment.start_time)

    
    const appointmentDate = startTime.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Johannesburg'
    })
    const appointmentTime = startTime.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Johannesburg'
    })

    
    const endTime = new Date(appointment.end_time)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.round(durationMs / (1000 * 60))

    
    const clientName = appointment.is_external_client 
      ? `${appointment.client_first_name || ''} ${appointment.client_last_name || ''}`.trim()
      : `${appointment.clients?.first_name || ''} ${appointment.clients?.last_name || ''}`.trim()
    
    const clientPhone = appointment.is_external_client 
      ? appointment.client_phone || ''
      : appointment.clients?.phone || ''

    const smsData: AppointmentSMSData = {
      appointment_id: appointment.id,
      sms_type: normalizedSmsType as AppointmentSMSData['sms_type'],
      client_phone: clientPhone,
      practitioner_phone: appointment.practitioners?.phone || '',
      client_name: clientName,
      practitioner_name: `${appointment.practitioners?.first_name || ''} ${appointment.practitioners?.last_name || ''}`.trim(),
      service_name: serviceNames,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      duration_minutes: durationMinutes
    }

    
    const formatPhoneNumber = (phone: string): string => {
      let formatted = phone.replace(/\s/g, '')
      
      
      if (formatted.startsWith('0')) {
        formatted = '27' + formatted.substring(1)
      }
      
      else if (formatted.startsWith('+')) {
        formatted = formatted.substring(1)
      }
      
      return formatted
    }

    
    const sendBatchSMS = async (messages: Array<{to: string, body: string}>): Promise<{success: boolean, error?: string}> => {
      try {
        const formattedMessages = messages.map(msg => ({
          to: formatPhoneNumber(msg.to),
          body: msg.body
        }))
        
        const response = await fetch('https://api.bulksms.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret),
          },
          body: JSON.stringify(formattedMessages)
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('BulkSMS API error:', errorData)
          return { success: false, error: errorData }
        }

        return { success: true }
      } catch (error) {
        console.error('Error sending batch SMS:', error)
        return { success: false, error: error.message }
      }
    }
    
    let clientMessage = ''
    let practitionerMessage = ''
    
    switch (smsData.sms_type) {
      case 'confirmation':
        clientMessage = `Hi ${smsData.client_name}! Your appointment for ${smsData.service_name} has been confirmed for ${smsData.appointment_date} at ${smsData.appointment_time}. We look forward to seeing you!`
        practitionerMessage = `New appointment confirmed! ${smsData.client_name} has booked ${smsData.service_name} for ${smsData.appointment_date} at ${smsData.appointment_time}.`
        break
      case 'reschedule':
        clientMessage = `Hi ${smsData.client_name}! Your appointment for ${smsData.service_name} has been rescheduled to ${smsData.appointment_date} at ${smsData.appointment_time}. We look forward to seeing you!`
        practitionerMessage = `Appointment rescheduled! ${smsData.client_name}'s appointment for ${smsData.service_name} is now on ${smsData.appointment_date} at ${smsData.appointment_time}.`
        break
      case 'cancellation':
        clientMessage = `Hi ${smsData.client_name}! Your appointment for ${smsData.service_name} on ${smsData.appointment_date} at ${smsData.appointment_time} has been cancelled. Please contact us to reschedule.`
        practitionerMessage = `Appointment cancelled! ${smsData.client_name}'s appointment for ${smsData.service_name} on ${smsData.appointment_date} at ${smsData.appointment_time} has been cancelled.`
        break
      case 'reminder':
        clientMessage = `Reminder: Hi ${smsData.client_name}! You have an appointment for ${smsData.service_name} tomorrow at ${smsData.appointment_time}. We look forward to seeing you!`
        practitionerMessage = `Reminder: You have an appointment with ${smsData.client_name} for ${smsData.service_name} tomorrow at ${smsData.appointment_time}.`
        break
      default:
        clientMessage = `Hi ${smsData.client_name}! Your appointment for ${smsData.service_name} has been confirmed for ${smsData.appointment_date} at ${smsData.appointment_time}. We look forward to seeing you!`
        practitionerMessage = `New appointment confirmed! ${smsData.client_name} has booked ${smsData.service_name} for ${smsData.appointment_date} at ${smsData.appointment_time}.`
        break
    }

    
    const batchMessages: Array<{to: string, body: string}> = []
    
    if (smsData.client_phone && send_client_sms) {
      batchMessages.push({
        to: smsData.client_phone,
        body: clientMessage
      })
    }
    
    if (smsData.practitioner_phone) {
      batchMessages.push({
        to: smsData.practitioner_phone,
        body: practitionerMessage
      })
    }

    
    let batchResult: {success: boolean, error?: string} = { success: false }
    if (batchMessages.length > 0) {
      batchResult = await sendBatchSMS(batchMessages)
    }

    
    const clientSMSResult = (smsData.client_phone && send_client_sms) ? batchResult.success : false
    const practitionerSMSResult = smsData.practitioner_phone ? batchResult.success : false
    const clientSMSError = (smsData.client_phone && send_client_sms && !batchResult.success) ? batchResult.error : null
    const practitionerSMSError = smsData.practitioner_phone && !batchResult.success ? batchResult.error : null

    
    await supabase
      .from('sms_logs')
      .upsert({
        appointment_id: appointment_id,
        sms_type: smsData.sms_type,
        client_phone: smsData.client_phone,
        practitioner_phone: smsData.practitioner_phone,
        client_sms_sent: clientSMSResult,
        practitioner_sms_sent: practitionerSMSResult,
        client_sms_error: clientSMSError,
        practitioner_sms_error: practitionerSMSError,
        appointment_date: smsData.appointment_date,
        appointment_time: smsData.appointment_time,
        service_names: smsData.service_name,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'appointment_id,sms_type'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS notifications sent',
        data: {
          client_sms_sent: clientSMSResult,
          practitioner_sms_sent: practitionerSMSResult
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-appointment-sms function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to send appointment SMS',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
