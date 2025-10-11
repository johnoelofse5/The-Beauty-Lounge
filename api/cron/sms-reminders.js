/**
 * Vercel Cron Job for Daily SMS Reminders
 * Runs at midnight UTC every day to send appointment reminders
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕛 Daily SMS Reminder Cron Job Started');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const functionUrl = `https://${projectRef}.supabase.co/functions/v1/process-scheduled-sms`;

    console.log(`Calling SMS function: ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('SMS Reminder Cron Job Completed:', result);

    res.status(200).json({
      success: true,
      message: 'Daily SMS reminders processed successfully',
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('SMS Reminder Cron Job Failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
