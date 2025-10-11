import { serve } from 'https:
import { createClient } from 'https:

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, email, phone } = await req.json()

    if (!userId || !email || !phone) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    
    const tempPassword = `mobile_${phone}_${Date.now()}`

    
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
      password: tempPassword
    })

    if (updateError) {
      throw new Error(`Failed to update user password: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session created successfully',
        tempPassword: tempPassword
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-mobile-session Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to create session',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
