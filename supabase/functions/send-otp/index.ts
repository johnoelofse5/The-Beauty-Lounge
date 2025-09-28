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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, purpose = 'signup' } = await req.json()

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate phone number format (allows South African format starting with 0)
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid phone number format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert South African phone number to international format for Twilio
    let formattedPhoneNumber = phoneNumber.replace(/\s/g, '')
    
    // If it starts with 0, replace with +27 (South Africa country code)
    if (formattedPhoneNumber.startsWith('0')) {
      formattedPhoneNumber = '+27' + formattedPhoneNumber.substring(1)
    }
    // If it doesn't start with +, add it
    else if (!formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = '+' + formattedPhoneNumber
    }

    // Create or update OTP in database
    const { data: otpCode, error: otpError } = await supabaseClient.rpc('create_or_update_otp', {
      phone_number_param: phoneNumber,
      purpose_param: purpose
    })

    if (otpError) {
      throw new Error(`Database error: ${otpError.message}`)
    }

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio configuration is missing')
    }

    // Use the already converted formattedPhoneNumber for Twilio
    const formattedPhone = formattedPhoneNumber

    // Create SMS message
    const message = `Your verification code is: ${otpCode}. This code expires in 10 minutes.`

    // Send SMS via Twilio
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(twilioAccountSid + ':' + twilioAuthToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'From': twilioPhoneNumber,
          'To': formattedPhone,
          'Body': message,
        }),
      }
    )

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json()
      throw new Error(`Twilio API error: ${errorData.message || twilioResponse.statusText}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // Only include OTP code in development for testing
        ...(Deno.env.get('NODE_ENV') === 'development' && { otp_code: otpCode })
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-otp Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to send OTP',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
