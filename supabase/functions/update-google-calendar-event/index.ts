import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GoogleCalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
  attendees?: Array<{ email: string }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: string
      minutes: number
    }>
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleCalendarClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')
    const googleCalendarClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')
    const googleCalendarRefreshToken = Deno.env.get('GOOGLE_CALENDAR_REFRESH_TOKEN')
    const googleCalendarId = Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary'

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { appointment_id } = await req.json()

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Appointment ID is required' }),
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
        notes,
        user_id,
        practitioner_id,
        service_ids,
        client_first_name,
        client_last_name,
        client_email,
        is_external_client,
        google_calendar_event_id,
        clients:user_id (
          id,
          first_name,
          last_name,
          email
        ),
        practitioners:practitioner_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', appointment_id)
      .single()

    if (appointmentError || !appointment) {
      console.error('Appointment fetch error:', appointmentError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Appointment not found'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!appointment.google_calendar_event_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No Google Calendar event associated with this appointment'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name')
      .in('id', appointment.service_ids || [])

    if (servicesError) {
      console.error('Services fetch error:', servicesError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to fetch service details'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const serviceNames = services?.map(s => s.name).join(', ') || 'Service'

    const clientName = appointment.is_external_client 
      ? `${appointment.client_first_name || ''} ${appointment.client_last_name || ''}`.trim()
      : `${appointment.clients?.first_name || ''} ${appointment.clients?.last_name || ''}`.trim()
    
    const clientEmail = appointment.is_external_client 
      ? appointment.client_email || ''
      : appointment.clients?.email || ''

    const practitionerName = `${appointment.practitioners?.first_name || ''} ${appointment.practitioners?.last_name || ''}`.trim()
    const practitionerEmail = appointment.practitioners?.email || ''

    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)

    const timeZone = 'Africa/Johannesburg'

    const eventTitle = `${serviceNames} - ${clientName}`
    
    let eventDescription = `Appointment Details:\n`
    eventDescription += `Client: ${clientName}\n`
    if (practitionerName) {
      eventDescription += `Practitioner: ${practitionerName}\n`
    }
    eventDescription += `Services: ${serviceNames}\n`
    if (appointment.notes) {
      eventDescription += `\nNotes: ${appointment.notes}\n`
    }

    const calendarEvent: GoogleCalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: timeZone
      },
      reminders: {
        useDefault: true
      }
    }

    const attendees: Array<{ email: string }> = []
    if (clientEmail) {
      attendees.push({ email: clientEmail })
    }
    if (practitionerEmail) {
      attendees.push({ email: practitionerEmail })
    }
    
    if (attendees.length > 0) {
      calendarEvent.attendees = attendees
    }

    const accessToken = await getAccessTokenFromRefreshToken(
      googleCalendarClientId,
      googleCalendarClientSecret,
      googleCalendarRefreshToken
    )

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${appointment.google_calendar_event_id}?sendUpdates=all`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text()
      console.error('Google Calendar API error:', errorData)
      return new Response(
        JSON.stringify({
          success: false,
          message: `Failed to update calendar event: ${errorData}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const eventData = await calendarResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Calendar event updated successfully',
        data: {
          event_id: eventData.id,
          calendar_url: eventData.htmlLink
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in update-google-calendar-event function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to update Google Calendar event',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function getAccessTokenFromRefreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth credentials')
  }
  
  const requestBody = new URLSearchParams({
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    refresh_token: refreshToken.trim(),
    grant_type: 'refresh_token'
  })
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: requestBody
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to get access token: ${errorData}`)
  }

  const data = await response.json()
  return data.access_token
}