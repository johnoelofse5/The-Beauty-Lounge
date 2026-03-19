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
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, phone, email } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select(
        `
        id,
        role:roles!role_id (
          name
        )
      `
      )
      .eq('id', requestingUser.id)
      .single();

    const roleName = profile?.role?.name;
    const isAuthorized = roleName === 'super_admin' || roleName === 'practitioner';

    if (!isAuthorized) {
      return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, message: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updatePayload: Record<string, string> = {};
    if (phone) updatePayload.phone = phone;
    if (email) updatePayload.email = email;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      updatePayload
    );

    if (updateError) throw new Error(updateError.message);

    return new Response(JSON.stringify({ success: true, message: 'User updated successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-update-user:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
