import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceLineItem {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface InvoiceData {
  id: string
  appointment_id: string
  invoice_number: string
  client_id: string
  practitioner_id: string
  total_amount: number
  services_data: InvoiceLineItem[]
  client_name: string
  client_phone: string
  client_email?: string
  appointment_date: string
  invoice_date: string
  status: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { appointment_id, current_user_id } = body

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Appointment ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const invoice = await generateInvoiceForAppointment(supabase, appointment_id, current_user_id)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const draw = (text: string, x: number, y: number, size = 12, bold = false) => {
      page.drawText(text, { x, y, size, font: bold ? boldFont : font, color: rgb(0, 0, 0) })
    }

    try {
      try { await (supabase as any).storage.createBucket('branding', { public: true }) } catch (_e) {}
      const logoPath = 'the beauty lounge logo.png'
      const { data: logoUrlData } = (supabase as any).storage.from('branding').getPublicUrl(logoPath)
      const logoUrl: string | undefined = logoUrlData?.publicUrl
      if (logoUrl) {
        const logoResp = await fetch(logoUrl)
        if (logoResp.ok) {
          const logoBuf = await logoResp.arrayBuffer()
          const pngImage = await pdfDoc.embedPng(logoBuf)
          const pngDims = pngImage.scale(0.25)
          const margin = 50
          const x = 595.28 - margin - pngDims.width
          const y = 800 - pngDims.height + 10
          page.drawImage(pngImage, { x, y, width: pngDims.width, height: pngDims.height })
        }
      }
    } catch (e) {
      console.warn(e)
    }

    draw('The Beauty Lounge', 50, 800, 20, true)
    draw(`Invoice: ${invoice.invoice_number}`, 50, 780, 12, true)
    draw(`Date: ${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-ZA') : new Date().toLocaleDateString('en-ZA')}`, 50, 765)
    page.drawRectangle({ x: 50, y: 755, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })

    draw('Bill To', 50, 735, 12, true)
    draw(`${invoice.client_name}`, 50, 720)
    if (invoice.client_phone) draw(`Phone: ${invoice.client_phone}`, 50, 705)

    draw('Appointment', 350, 735, 12, true)
    draw(`Date: ${invoice.appointment_date ? new Date(invoice.appointment_date).toLocaleDateString('en-ZA') : 'N/A'}`, 350, 720)

    page.drawRectangle({ x: 50, y: 700, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })
    draw('Services', 50, 685, 14, true)
    draw('Service', 50, 665, 12, true)
    draw('Duration', 380, 665, 12, true)
    draw('Price', 470, 665, 12, true)
    page.drawRectangle({ x: 50, y: 660, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })

    let y = 645
    const services = Array.isArray(invoice.services_data) ? invoice.services_data : []
    for (const s of services) {
      draw(`${s.name}`, 50, y)
      draw(`${s.duration_minutes || 0} min`, 380, y)
      draw(`R${Number(s.price || 0).toFixed(2)}`, 470, y)
      y -= 16
      if (y < 120) break
    }

    const computedTotal = services.reduce((sum: number, s: any) => sum + Number(s.price || 0), 0)
    page.drawRectangle({ x: 50, y: y - 8, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })
    draw(`Total: R${(Number(invoice.total_amount || 0) || computedTotal).toFixed(2)}`, 50, y - 28, 14, true)

    const pdfBytes = await pdfDoc.save()

    try {
      await (supabase as any).storage.createBucket('invoices', { public: true })
    } catch (_e) {}

    const filePath = `${invoice.invoice_number}.pdf`
    const { error: uploadError } = await (supabase as any).storage
      .from('invoices')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to upload invoice PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: publicUrlData } = (supabase as any).storage.from('invoices').getPublicUrl(filePath)
    const publicUrl: string | undefined = publicUrlData?.publicUrl

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        pdf_url: publicUrl,
        status: 'generated'
      })
      .eq('id', invoice.id)

    if (updateError) {
      throw new Error(`Failed to update invoice with PDF URL: ${updateError.message}`)
    }

    const responseData = { 
      success: true, 
      message: 'Invoice PDF generated successfully',
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        pdf_url: publicUrl,
        client_name: invoice.client_name,
        total_amount: invoice.total_amount,
        services_data: invoice.services_data,
        appointment_date: invoice.appointment_date,
        invoice_date: invoice.invoice_date
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to generate invoice PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateInvoiceForAppointment(supabase: any, appointmentId: string, currentUserId?: string): Promise<InvoiceData> {
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select(`
      id,
      user_id,
      practitioner_id,
      service_ids,
      service_id,
      appointment_date,
      start_time,
      end_time,
      notes,
      status
    `)
    .eq('id', appointmentId)
    .single()

  if (appointmentError || !appointment) {
    throw new Error('Appointment not found')
  }

  const { data: client, error: clientError } = await supabase
    .from('users')
    .select('first_name, last_name, email, phone')
    .eq('id', appointment.user_id)
    .single()

  if (clientError || !client) {
    throw new Error('Client not found')
  }

  const serviceIds: string[] = Array.isArray((appointment as any).service_ids)
    ? (appointment as any).service_ids.filter((id: any) => typeof id === 'string')
    : ((appointment as any).service_id ? [(appointment as any).service_id] : [])

  let servicesData: InvoiceLineItem[] = []
  if (serviceIds.length > 0) {
    const { data: servicesRows, error: servicesFetchError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .in('id', serviceIds)

    if (servicesFetchError) {
      throw new Error('Failed to fetch services')
    }
    servicesData = (servicesRows || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price || 0,
      duration_minutes: s.duration_minutes
    }))
  }

  const totalAmount = servicesData.reduce((sum, service) => sum + service.price, 0)

  const { data: invoiceNumber, error: invoiceNumberError } = await supabase
    .rpc('generate_invoice_number')

  if (invoiceNumberError) {
    throw new Error(`Failed to generate invoice number: ${invoiceNumberError.message}`)
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      appointment_id: appointmentId,
      invoice_number: invoiceNumber,
      client_id: appointment.user_id,
      practitioner_id: currentUserId || appointment.practitioner_id,
      total_amount: totalAmount,
      services_data: servicesData,
      client_name: `${client.first_name} ${client.last_name}`,
      client_phone: client.phone,
      client_email: client.email,
      appointment_date: appointment.appointment_date,
      invoice_date: new Date().toISOString(),
      status: 'generated'
    })
    .select('id, invoice_number, client_name, total_amount, client_email, services_data, appointment_date, invoice_date')
    .single()

  if (invoiceError) {
    throw new Error(`Failed to create invoice: ${invoiceError.message}`)
  }

  return invoice
}
