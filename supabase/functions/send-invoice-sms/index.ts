import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }


  let appointmentIdForCatch: string | undefined

  try {
    const bulksmsTokenId = Deno.env.get('BULKSMS_TOKEN_ID')
    const bulksmsTokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!bulksmsTokenId || !bulksmsTokenSecret) {
      throw new Error('Missing BulkSMS configuration')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { appointment_id, current_user_id } = await req.json()
    appointmentIdForCatch = appointment_id

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Appointment ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { appointment_id, current_user_id }
    })

    if (invoiceError || !invoiceData?.success) {
      throw new Error(`Failed to generate invoice: ${invoiceError?.message || 'Unknown error'}`)
    }

    const generatorPayload = invoiceData.data
    const generatedInvoiceId: string | undefined = generatorPayload?.invoice_id

    if (!generatedInvoiceId) {
      throw new Error('Invoice ID not returned by generator')
    }

    const { data: invoice, error: fetchInvoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_id, client_name, client_phone, appointment_id, appointment_date, total_amount, pdf_url, status')
      .eq('id', generatedInvoiceId)
      .single()

    if (fetchInvoiceError || !invoice) {
      throw new Error(`Failed to fetch invoice row: ${fetchInvoiceError?.message || 'Unknown error'}`)
    }

    let rawPhone = (invoice.client_phone ?? '').toString().trim()
    if (!rawPhone) {
      const { data: aptRow, error: aptErr } = await supabase
        .from('appointments')
        .select('client_phone, user_id')
        .eq('id', appointment_id)
        .single()

      rawPhone = (aptRow?.client_phone ?? '').toString().trim()
      if (!rawPhone && aptRow?.user_id) {
        const { data: clientRow } = await supabase
          .from('users')
          .select('phone')
          .eq('id', aptRow.user_id)
          .single()

        rawPhone = (clientRow?.phone ?? '').toString().trim()
      }
    }
    if (!rawPhone) {
      throw new Error('Missing client phone number on invoice')
    }

    let formattedPhone = rawPhone.replace(/\s/g, '')

    if (formattedPhone.startsWith('0')) {
      formattedPhone = '27' + formattedPhone.substring(1)
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1)
    }

    const firstName = (invoice.client_name || '').split(' ')[0] || 'there'
    const messageCore = `Hi ${firstName}! Your invoice for your appointment on ${new Date(invoice.appointment_date).toLocaleDateString('en-ZA')} is ready. Total: R${Number(invoice.total_amount || 0).toFixed(2)}.`
    const link = typeof invoice.pdf_url === 'string' ? invoice.pdf_url : ''
    const message = link
      ? `${messageCore} View invoice: ${link}\nThank you for choosing The Beauty Lounge by Stacey!`
      : `${messageCore} Thank you for choosing The Beauty Lounge by Stacey!`

    const requestBody = {
      to: formattedPhone,
      body: message,
    }

    const authHeader = 'Basic ' + btoa(bulksmsTokenId + ':' + bulksmsTokenSecret)

    const smsResponse = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const smsResult = await smsResponse.json()

    if (!smsResponse.ok) {
      throw new Error(`SMS sending failed: ${smsResult.message || 'Unknown error'}`)
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sms_sent: true,
        sms_sent_at: new Date().toISOString(),
        sms_error: null
      })
      .eq('id', generatedInvoiceId)


    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice SMS sent successfully',
        data: {
          invoice_id: generatedInvoiceId,
          invoice_number: invoice.invoice_number,
          client_phone: rawPhone,
          sms_sent: true,
          sms_response: smsResult
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    const appointment_id = typeof appointmentIdForCatch !== 'undefined' ? appointmentIdForCatch : undefined
    if (appointment_id) {
      await supabase
        .from('invoices')
        .update({
          status: 'failed',
          sms_sent: false,
          sms_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('appointment_id', appointment_id)
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to send invoice SMS',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
