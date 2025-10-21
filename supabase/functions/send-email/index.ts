import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY');

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  encoding: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    const { to, subject, html, text, attachments }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!MAILERSEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'MAILERSEND_API_KEY not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const emailPayload: any = {
      from: {
        email: 'noreply@test-3m5jgro1d9dgdpyo.mlsender.net',
        name: "The Beauty Lounge"
      },
      to: [
        {
          email: to
        }
      ],
      subject,
      html,
      text,
    };
    
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        disposition: 'attachment'
      }));
    }

    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MailerSend API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: errorData.message || 'Failed to send email',
          details: errorData 
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const messageId = response.headers.get('X-Message-Id');

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: messageId || 'sent'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});