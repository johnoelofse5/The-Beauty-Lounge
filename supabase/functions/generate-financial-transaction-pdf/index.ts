import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FinancialTransaction {
  id: string
  transaction_type: 'income' | 'expense'
  category: string
  amount: number
  transaction_date: string
  reference_id?: string
  reference_type?: string
  payment_method?: string
  receipt_number?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

serve(async (req) => {
  console.log('Financial transaction PDF edge function called with method:', req.method)

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
    const { report_type, date_from, date_to } = body
    console.log('Request body:', { report_type, date_from, date_to })

    if (!report_type || !date_from || !date_to) {
      return new Response(
        JSON.stringify({ success: false, message: 'Report type, date_from, and date_to are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Fetching financial transactions')
    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .gte('transaction_date', date_from)
      .lte('transaction_date', date_to)
      .order('transaction_date', { ascending: false })

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      throw new Error(`Failed to fetch transactions: ${transactionsError.message}`)
    }

    const transactionsData = (transactions || []) as FinancialTransaction[]
    console.log('Transactions fetched:', transactionsData.length)

    const totalIncome = transactionsData
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const totalExpenses = transactionsData
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const netProfit = totalIncome - totalExpenses

    console.log('Creating PDF document')
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const draw = (text: string, x: number, y: number, size = 12, bold = false) => {
      page.drawText(text, { x, y, size, font: bold ? boldFont : font, color: rgb(0, 0, 0) })
    }

    // Try to load logo
    try {
      console.log('Attempting to load logo')
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
          console.log('Logo added to PDF')
        } else {
          console.log('Logo fetch failed:', logoResp.status)
        }
      } else {
        console.log('No logo URL found')
      }
    } catch (e) {
      console.warn('Error loading logo:', e)
    }

    // Header
    const reportTitle = report_type === 'monthly' ? 'Monthly Financial Transaction Report' : 'Yearly Financial Transaction Report'
    draw('The Beauty Lounge', 50, 800, 20, true)
    draw(reportTitle, 50, 780, 14, true)
    
    const dateFrom = new Date(date_from)
    const dateTo = new Date(date_to)
    const dateRange = report_type === 'monthly' 
      ? `${dateFrom.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`
      : `${dateFrom.toLocaleDateString('en-ZA', { year: 'numeric' })}`
    
    draw(`Period: ${dateRange}`, 50, 765)
    draw(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 50, 750)
    page.drawRectangle({ x: 50, y: 740, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })

    // Summary Section
    draw('Summary', 50, 720, 14, true)
    draw(`Total Income: R${totalIncome.toFixed(2)}`, 50, 700, 12)
    draw(`Total Expenses: R${totalExpenses.toFixed(2)}`, 50, 685, 12)
    draw(`Net Profit: R${netProfit.toFixed(2)}`, 50, 670, 12, true)
    page.drawRectangle({ x: 50, y: 655, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })

    // Transactions Table Header
    draw('Transactions', 50, 640, 14, true)
    draw('Date', 50, 620, 11, true)
    draw('Type', 120, 620, 11, true)
    draw('Category', 180, 620, 11, true)
    draw('Payment Method', 300, 620, 11, true)
    draw('Amount', 450, 620, 11, true)
    page.drawRectangle({ x: 50, y: 615, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })

    let y = 600
    const lineHeight = 14
    const pageBottom = 50

    for (const transaction of transactionsData) {
      if (y < pageBottom + lineHeight) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = 800
        
        // Redraw header on new page
        draw('Date', 50, y, 11, true)
        draw('Type', 120, y, 11, true)
        draw('Category', 180, y, 11, true)
        draw('Payment Method', 300, y, 11, true)
        draw('Amount', 450, y, 11, true)
        page.drawRectangle({ x: 50, y: y - 5, width: 495.28, height: 1, color: rgb(0.9, 0.9, 0.9) })
        y -= 20
      }

      const transactionDate = new Date(transaction.transaction_date).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      
      const type = transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)
      const category = transaction.category || 'N/A'
      const paymentMethod = transaction.payment_method || 'N/A'
      const amount = Number(transaction.amount || 0)
      const amountText = `${transaction.transaction_type === 'income' ? '+' : '-'}R${amount.toFixed(2)}`
      const amountColor = transaction.transaction_type === 'income' ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0)

      draw(transactionDate, 50, y, 10)
      draw(type, 120, y, 10)
      
      // Truncate category if too long
      const maxCategoryWidth = 100
      const categoryText = category.length > 20 ? category.substring(0, 20) + '...' : category
      draw(categoryText, 180, y, 10)
      
      draw(paymentMethod, 300, y, 10)
      page.drawText(amountText, { 
        x: 450, 
        y, 
        size: 10, 
        font: font, 
        color: amountColor 
      })

      // Add receipt number if available
      if (transaction.receipt_number) {
        y -= lineHeight
        draw(`Receipt: ${transaction.receipt_number}`, 180, y, 9)
      }

      y -= lineHeight
    }

    console.log('Saving PDF')
    const pdfBytes = await pdfDoc.save()

    // Upload to storage
    try {
      console.log('Creating financial-reports bucket if needed')
      await (supabase as any).storage.createBucket('financial-reports', { public: true })
    } catch (_e) {}

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${report_type}-financial-report-${timestamp}.pdf`
    console.log('Uploading PDF to storage:', fileName)
    const { error: uploadError } = await (supabase as any).storage
      .from('financial-reports')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to upload financial report PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: publicUrlData } = (supabase as any).storage.from('financial-reports').getPublicUrl(fileName)
    const publicUrl: string | undefined = publicUrlData?.publicUrl
    console.log('PDF public URL:', publicUrl)

    console.log('Financial report process completed successfully')
    const responseData = { 
      success: true, 
      message: 'Financial transaction PDF generated successfully',
      data: {
        pdf_url: publicUrl,
        report_type,
        date_from,
        date_to,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        transaction_count: transactionsData.length
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
    console.error('Error in edge function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to generate financial transaction PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

