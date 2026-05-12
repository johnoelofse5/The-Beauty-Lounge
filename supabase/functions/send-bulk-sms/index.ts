// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID');
    const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!bulksmsTokenId || !bulksmsTokenSecret) {
      throw new Error('Missing BulkSMS configuration');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, user_ids } = await req.json();

    if (!message || !String(message).trim()) {
      return new Response(JSON.stringify({ success: false, message: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'At least one recipient is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, phone')
      .in('id', user_ids)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .not('phone', 'is', null);

    if (usersError) {
      throw new Error('Failed to fetch user phone numbers');
    }

    const formatPhone = (phone: string): string => {
      let formatted = phone.replace(/\s/g, '');
      if (formatted.startsWith('0')) formatted = '27' + formatted.substring(1);
      else if (formatted.startsWith('+')) formatted = formatted.substring(1);
      return formatted;
    };

    const messages = (users ?? [])
      .filter((u) => u.phone && String(u.phone).trim())
      .map((u) => ({ to: formatPhone(String(u.phone)), body: String(message).trim() }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No valid phone numbers found for the selected recipients',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bulksmsResponse = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret),
      },
      body: JSON.stringify(messages),
    });

    const smsSent = bulksmsResponse.ok;
    const errorBody = smsSent ? null : await bulksmsResponse.text();

    if (!smsSent) {
      console.error('BulkSMS API error:', errorBody);
    }

    const now = new Date().toISOString();
    const auditRecords = messages.map((msg) => ({
      sms_type: 'bulk',
      client_phone: msg.to,
      client_sms_sent: smsSent,
      client_sms_error: smsSent ? null : errorBody,
      practitioner_sms_sent: false,
      status: smsSent ? 'sent' : 'failed',
      reason: smsSent ? null : errorBody,
      scheduled: false,
      cancelled: false,
      created_at: now,
    }));

    try {
      const { error: auditError } = await supabase.from('sms_logs').insert(auditRecords);
      if (auditError) console.error('Audit insert failed:', auditError.message);
    } catch (auditErr) {
      console.error('Audit insert threw:', auditErr);
    }

    if (!smsSent) {
      throw new Error(`BulkSMS error: ${errorBody}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SMS sent to ${messages.length} recipient(s)`,
        sent_count: messages.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-bulk-sms:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to send SMS',
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
