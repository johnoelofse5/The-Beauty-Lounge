import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getFCMAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const claimSetB64 = btoa(JSON.stringify(claimSet))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const dataToSign = `${headerB64}.${claimSetB64}`;
  const dataBytes = encoder.encode(dataToSign);

  const keyData = serviceAccount.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = keyData.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBytes);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${headerB64}.${claimSetB64}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get FCM access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function sendPushOTP(
  supabaseClient: any,
  phoneNumber: string,
  otpCode: string
): Promise<boolean> {
  console.log('sendPushOTP: Looking up user with phone:', phoneNumber);

  const { data: profile, error: profileError } = await supabaseClient
    .from('user_profiles')
    .select('id')
    .eq('phone', phoneNumber)
    .single();

  if (profileError || !profile) {
    console.log('sendPushOTP: No profile found for phone:', phoneNumber, profileError?.message);
    return false;
  }

  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id, fcm_token, push_enabled')
    .eq('id', profile.id)
    .single();

  if (userError || !user) {
    console.log(
      'sendPushOTP: No user record found for profile id:',
      profile.id,
      userError?.message
    );
    return false;
  }

  console.log('sendPushOTP: User found:', {
    id: user.id,
    push_enabled: user.push_enabled,
    has_fcm_token: !!user.fcm_token,
  });

  if (!user.push_enabled) {
    console.log('sendPushOTP: push_enabled is false');
    return false;
  }

  if (!user.fcm_token) {
    console.log('sendPushOTP: fcm_token is null/empty');
    return false;
  }

  try {
    const firebaseServiceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!);
    const accessToken = await getFCMAccessToken(firebaseServiceAccount);
    const projectId = firebaseServiceAccount.project_id;

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: user.fcm_token,
            notification: {
              title: 'Your Verification Code',
              body: `Your code is: ${otpCode}`,
            },
            data: {
              type: 'otp',
              otp_code: otpCode,
            },
            android: { priority: 'high' },
            apns: { headers: { 'apns-priority': '10' } },
          },
        }),
      }
    );

    const fcmResult = await fcmResponse.json();

    if (fcmResponse.status < 200 || fcmResponse.status > 299) {
      console.error('FCM send failed:', fcmResult);
      if (
        fcmResult.error?.message?.includes('INVALID_ARGUMENT') ||
        fcmResult.error?.message?.includes('UNREGISTERED')
      ) {
        await supabaseClient.from('users').update({ fcm_token: null }).eq('id', user.id);
      }
      return false;
    }

    await supabaseClient.from('push_notifications').insert({
      user_id: user.id,
      title: 'Your Verification Code',
      body: `Your code is: ${otpCode}`,
      data: { type: 'otp', otp_code: otpCode },
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error('Push send error:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('OTP Send Function Started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumber, purpose = 'signup', source = 'web' } = await req.json();
    console.log('Request Data:', { phoneNumber, purpose, source });

    if (!phoneNumber) {
      return new Response(JSON.stringify({ success: false, message: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedPhoneNumber = phoneNumber.replace(/\s/g, '');

    if (formattedPhoneNumber.startsWith('0')) {
      formattedPhoneNumber = '27' + formattedPhoneNumber.substring(1);
    } else if (formattedPhoneNumber.startsWith('+')) {
      formattedPhoneNumber = formattedPhoneNumber.substring(1);
    }

    const { data: otpCode, error: otpError } = await supabaseClient.rpc('create_or_update_otp', {
      phone_number_param: phoneNumber,
      purpose_param: purpose,
    });

    if (otpError) {
      console.error('Database error creating OTP:', otpError);
      throw new Error(`Database error: ${otpError.message}`);
    }

    console.log('OTP created:', otpCode);

    let deliveredVia = 'sms';

    if (source === 'mobile') {
      const pushSent = await sendPushOTP(supabaseClient, formattedPhoneNumber, otpCode);
      if (pushSent) {
        deliveredVia = 'push';
        console.log('OTP sent via push notification');
      } else {
        console.log('Push failed or unavailable, falling back to SMS');
      }
    }

    if (deliveredVia === 'sms') {
      const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID');
      const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET');

      if (!bulksmsTokenId || !bulksmsTokenSecret) {
        throw new Error('BulkSMS configuration is missing');
      }

      const message = `${otpCode}`;
      const authHeader = 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret);

      const bulksmsResponse = await fetch('https://api.bulksms.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          to: formattedPhoneNumber,
          body: message,
        }),
      });

      if (!bulksmsResponse.ok) {
        const errorData = await bulksmsResponse.text();
        console.error('BulkSMS API Error:', errorData);
        throw new Error(`BulkSMS API error: ${errorData}`);
      }

      console.log('OTP sent via SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        deliveredVia,
        ...(Deno.env.get('NODE_ENV') === 'development' && { otp_code: otpCode }),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OTP Send Function Failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to send OTP',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
