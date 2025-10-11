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
    console.log('OTP Send Function Started')
    
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, purpose = 'signup' } = await req.json()
    console.log('📱 Request Data:', { phoneNumber, purpose })

    if (!phoneNumber) {
      console.log('No phone number provided')
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    console.log('🔍 Phone validation:', { original: phoneNumber, cleaned: cleanPhone, valid: phoneRegex.test(cleanPhone) })
    
    if (!phoneRegex.test(cleanPhone)) {
      console.log('❌ Invalid phone number format')
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid phone number format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    
    let formattedPhoneNumber = phoneNumber.replace(/\s/g, '')
    console.log('Original phone:', formattedPhoneNumber)
    
    
    if (formattedPhoneNumber.startsWith('0')) {
      formattedPhoneNumber = '27' + formattedPhoneNumber.substring(1)
      console.log('🇿🇦 Converted SA number:', formattedPhoneNumber)
    }
    
    else if (formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = formattedPhoneNumber.substring(1)
      console.log('🌍 Removed + prefix:', formattedPhoneNumber)
    }
    else {
      console.log('📱 Using phone as-is:', formattedPhoneNumber)
    }

    
    console.log('💾 Creating OTP in database...')
    const { data: otpCode, error: otpError } = await supabaseClient.rpc('create_or_update_otp', {
      phone_number_param: phoneNumber,
      purpose_param: purpose
    })

    if (otpError) {
      console.error('❌ Database error creating OTP:', otpError)
      throw new Error(`Database error: ${otpError.message}`)
    }
    
    console.log('OTP created successfully:', otpCode)

    
    console.log('Checking BulkSMS credentials...')
    const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID')
    const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')

    console.log('BulkSMS Token ID exists:', !!bulksmsTokenId)
    console.log('BulkSMS Token Secret exists:', !!bulksmsTokenSecret)
    if (!bulksmsTokenId || !bulksmsTokenSecret) {
      console.error('BulkSMS configuration is missing')
      throw new Error('BulkSMS configuration is missing')
    }

    
    const formattedPhone = formattedPhoneNumber
    console.log('📱 Final formatted phone for BulkSMS:', formattedPhone)

    
    const message = `${otpCode}`
    console.log('💬 SMS Message:', message)

    
    const requestBody = {
      to: formattedPhone,
      body: message
      
    }
    console.log('📤 BulkSMS Request Body:', requestBody)
    
    const authHeader = 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret)
    console.log('🔐 Auth header prepared:', authHeader.substring(0, 20) + '...')

    
    console.log('🚀 Sending SMS via BulkSMS API...')
    const bulksmsResponse = await fetch(
      'https:
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(requestBody)
      }
    )

    console.log('📊 BulkSMS Response Status:', bulksmsResponse.status)
    console.log('📊 BulkSMS Response Headers:', Object.fromEntries(bulksmsResponse.headers.entries()))

    if (!bulksmsResponse.ok) {
      const errorData = await bulksmsResponse.text()
      console.error('❌ BulkSMS API Error:', {
        status: bulksmsResponse.status,
        statusText: bulksmsResponse.statusText,
        error: errorData
      })
      throw new Error(`BulkSMS API error: ${errorData}`)
    }

    const responseData = await bulksmsResponse.text()
    console.log('✅ BulkSMS Response:', responseData)

    
    try {
      const responseJson = JSON.parse(responseData)
      if (Array.isArray(responseJson) && responseJson.length > 0) {
        const message = responseJson[0]
        console.log('📊 Message Status:', {
          id: message.id,
          status: message.status?.type,
          statusId: message.status?.id,
          from: message.from,
          to: message.to,
          body: message.body?.substring(0, 50) + '...'
        })
        
        
        if (message.status?.type === 'ACCEPTED') {
          console.log('✅ Message accepted by BulkSMS - should be delivered')
        } else {
          console.log('⚠️ Message status:', message.status?.type)
        }
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse BulkSMS response:', parseError)
    }

    console.log('🎉 OTP sent successfully!')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        
        ...(Deno.env.get('NODE_ENV') === 'development' && { otp_code: otpCode })
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 OTP Send Function Failed:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    })
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
