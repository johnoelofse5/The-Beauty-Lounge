import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      .select('id, google_calendar_event_id')
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

    const accessToken = await getAccessTokenFromRefreshToken(
      googleCalendarClientId,
      googleCalendarClientSecret,
      googleCalendarRefreshToken
    )

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${appointment.google_calendar_event_id}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!calendarResponse.ok && calendarResponse.status !== 204 && calendarResponse.status !== 410) {
      const errorData = await calendarResponse.text()
      console.error('Google Calendar API error:', errorData)
      
      if (calendarResponse.status === 410) {
        console.log('Calendar event was already deleted')
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to delete calendar event: ${errorData}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ google_calendar_event_id: null })
      .eq('id', appointment_id)

    if (updateError) {
      console.error('Error clearing calendar event ID from appointment:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Calendar event deleted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-google-calendar-event function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to delete Google Calendar event',
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