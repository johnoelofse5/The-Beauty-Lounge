import { EmailOptions, EmailResponse } from '../types/email';
import { supabase } from './supabase';

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: options
    });

    if (error) {
      console.error('Error calling send-email function:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    return {
      success: data?.success || false,
      messageId: data?.messageId,
      error: data?.error
    };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendInvoiceEmail(
  appointmentId: string,
  currentUserId: string,
  recipientEmail: string
): Promise<{
  success: boolean;
  message: string;
  data?: {
    invoice_id: string;
    invoice_number: string;
    email_sent: boolean;
  };
}> {
  try {

    const generatePayload = {
      appointment_id: appointmentId,
      current_user_id: currentUserId,
    };

    const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke(
      'generate-invoice-pdf',
      { body: generatePayload }
    );

    if (invoiceError || !invoiceData?.success) {
      return {
        success: false,
        message: invoiceData?.message || 'Failed to generate invoice PDF',
      };
    }

    const invoice = invoiceData.data;

    const pdfResponse = await fetch(invoice.pdf_url);

    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF file');
    }

    const pdfBlob = await pdfResponse.blob();
    const pdfBase64 = await blobToBase64(pdfBlob);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
      </head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #F2C7EB, #E8A8D8); border-radius: 10px;">
      <h1 style="color: #374151; margin: 0; font-size: 28px; font-weight: bold;">Invoice ${invoice.invoice_number}</h1>
          </div>
    
    <div style="padding: 20px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear ${invoice.client_name},</p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Thank you for your business! Please find your invoice attached to this email.</p>
            
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E8A8D8;">
        <p style="margin: 0; font-size: 18px; color: #374151;"><strong>Total Amount: R${invoice.total_amount?.toFixed(2)}</strong></p>
            </div>
            
      <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>📎 Invoice Attached</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e40af;">Your invoice is attached as a PDF document. Please download and save it for your records.</p>
            </div>
            
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Thank you for your business!</p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 0;">Best regards,<br/><strong>The Beauty Lounge</strong></p>
          </div>
    
    <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">This is an automated invoice. Please do not reply to this email.</p>
      <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} The Beauty Lounge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Invoice ${invoice.invoice_number}

Dear ${invoice.client_name},

Thank you for your business! Please find your invoice attached.

Total: $${invoice.total_amount?.toFixed(2)}

Best regards,
The Beauty Lounge
`;

    const emailResponse = await sendEmail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoice_number} - The Beauty Lounge`,
      html,
      text,
      attachments: [
        {
          filename: `Invoice_${invoice.invoice_number}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
          encoding: 'base64',
        },
      ],
    });

    if (!emailResponse.success) {
      return {
        success: false,
        message: emailResponse.error || 'Failed to send invoice email',
      };
    }
    
    return {
      success: true,
      message: 'Invoice email sent successfully',
      data: {
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        email_sent: true,
      },
    };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}