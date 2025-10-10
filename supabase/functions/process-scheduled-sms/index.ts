import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Daily SMS Reminder Cron Job Started')
    
    // Get today's date in UTC
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    
    console.log(`Processing appointments for: ${today.toISOString().split('T')[0]}`)

    // Get all appointments scheduled for today
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, start_time, status')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .in('status', ['confirmed', 'pending'])

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    console.log(`Found ${appointments?.length || 0} appointments for today`)

    let successCount = 0
    let errorCount = 0

    // Process each appointment
    for (const appointment of appointments || []) {
      try {
        console.log(`Processing appointment ${appointment.id}`)
        
        // Check if we already sent a reminder today
        const { data: existingSMS } = await supabase
          .from('sms_logs')
          .select('id')
          .eq('appointment_id', appointment.id)
          .eq('sms_type', 'reminder')
          .gte('created_at', today.toISOString())
          .limit(1)

        if (existingSMS && existingSMS.length > 0) {
          console.log(`Reminder already sent for appointment ${appointment.id}`)
          continue
        }

        // Send reminder SMS immediately
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-appointment-sms', {
          body: {
            appointment_id: appointment.id,
            sms_type: 'reminder'
          }
        })

        if (smsError) {
          console.error(`Error sending reminder for appointment ${appointment.id}:`, smsError)
          errorCount++
        } else if (smsResult?.success) {
          console.log(`Successfully sent reminder for appointment ${appointment.id}`)
          successCount++
        } else {
          console.error(`Failed to send reminder for appointment ${appointment.id}:`, smsResult?.message)
          errorCount++
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error)
        errorCount++
      }
    }

    console.log(`Cron Job Completed - Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily SMS reminders processed',
        appointments_found: appointments?.length || 0,
        success_count: successCount,
        error_count: errorCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Daily SMS Reminder Cron Job Failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to process daily SMS reminders',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
