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

    const { phoneNumber, otpCode, purpose = 'signup' } = await req.json()

    if (!phoneNumber || !otpCode) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number and OTP code are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate OTP code format
    if (!/^\d{6}$/.test(otpCode)) {
      return new Response(
        JSON.stringify({ success: false, message: 'OTP code must be 6 digits' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify OTP
    const { data: isValid, error: verifyError } = await supabaseClient.rpc('verify_otp', {
      phone_number_param: phoneNumber,
      otp_code_param: otpCode,
      purpose_param: purpose
    })

    if (verifyError) {
      throw new Error(`Database error: ${verifyError.message}`)
    }

    if (isValid) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP verified successfully' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid or expired OTP code' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in verify-otp Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to verify OTP',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
