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

    // Convert South African phone number to international format for BulkSMS
    let formattedPhoneNumber = phoneNumber.replace(/\s/g, '')
    
    // If it starts with 0, replace with 27 (South Africa country code without +)
    if (formattedPhoneNumber.startsWith('0')) {
      formattedPhoneNumber = '27' + formattedPhoneNumber.substring(1)
    }
    // If it starts with +, remove it
    else if (formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = formattedPhoneNumber.substring(1)
    }

    // Create or update OTP in database
    const { data: otpCode, error: otpError } = await supabaseClient.rpc('create_or_update_otp', {
      phone_number_param: phoneNumber,
      purpose_param: purpose
    })

    if (otpError) {
      throw new Error(`Database error: ${otpError.message}`)
    }

    // Send SMS via BulkSMS
    const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID')
    const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')

    if (!bulksmsTokenId || !bulksmsTokenSecret) {
      throw new Error('BulkSMS configuration is missing')
    }

    // Use the already converted formattedPhoneNumber for BulkSMS
    const formattedPhone = formattedPhoneNumber

    // Create SMS message
    const message = `Your verification code is: ${otpCode}. This code expires in 10 minutes.`

    // Send SMS via BulkSMS
    const bulksmsResponse = await fetch(
      'https://api.bulksms.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret),
        },
        body: JSON.stringify({
          to: formattedPhone,
          body: message
        })
      }
    )

    if (!bulksmsResponse.ok) {
      const errorData = await bulksmsResponse.text()
      throw new Error(`BulkSMS API error: ${errorData}`)
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
