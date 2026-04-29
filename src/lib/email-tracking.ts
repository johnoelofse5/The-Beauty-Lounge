import { supabase } from './supabase';
import {
  EmailTracking,
  EmailTrackingCreate,
  EmailTrackingUpdate,
  EmailType,
  EmailStatus,
} from '@/types/email-tracking';

export type { EmailTracking, EmailTrackingCreate, EmailTrackingUpdate, EmailType, EmailStatus };

export async function createEmailTracking(data: EmailTrackingCreate): Promise<EmailTracking> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating email tracking:', error);
    throw new Error(`Failed to create email tracking: ${error.message}`);
  }

  return emailTracking;
}

export async function updateEmailTracking(
  id: string,
  updates: EmailTrackingUpdate
): Promise<EmailTracking> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating email tracking:', error);
    throw new Error(`Failed to update email tracking: ${error.message}`);
  }

  return emailTracking;
}

export async function getAllEmailTracking(): Promise<EmailTracking[]> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email tracking:', error);
    throw new Error(`Failed to fetch email tracking: ${error.message}`);
  }

  return emailTracking || [];
}

export async function getEmailTrackingByEmail(email: string): Promise<EmailTracking[]> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email tracking by email:', error);
    throw new Error(`Failed to fetch email tracking: ${error.message}`);
  }

  return emailTracking || [];
}

export async function getEmailTrackingByType(emailType: EmailType): Promise<EmailTracking[]> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('email_type', emailType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email tracking by type:', error);
    throw new Error(`Failed to fetch email tracking: ${error.message}`);
  }

  return emailTracking || [];
}

export async function getEmailTrackingByStatus(status: EmailStatus): Promise<EmailTracking[]> {
  const { data: emailTracking, error } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email tracking by status:', error);
    throw new Error(`Failed to fetch email tracking: ${error.message}`);
  }

  return emailTracking || [];
}

export async function trackPasswordResetEmail(
  email: string,
  metadata?: Record<string, unknown>
): Promise<EmailTracking> {
  return createEmailTracking({
    email,
    email_type: 'password_reset',
    subject: 'Reset Your Password',
    status: 'pending',
    metadata: {
      ...metadata,
      tracked_at: new Date().toISOString(),
    },
  });
}

export async function markEmailAsSent(trackingId: string, sentAt?: string): Promise<EmailTracking> {
  return updateEmailTracking(trackingId, {
    status: 'sent',
    sent_at: sentAt || new Date().toISOString(),
  });
}

export async function markEmailAsFailed(
  trackingId: string,
  errorMessage: string,
  failedAt?: string
): Promise<EmailTracking> {
  return updateEmailTracking(trackingId, {
    status: 'failed',
    failed_at: failedAt || new Date().toISOString(),
    error_message: errorMessage,
  });
}

export async function getEmailTrackingStats(): Promise<{
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
}> {
  const { data, error } = await supabase.from('email_tracking').select('status');

  if (error) {
    console.error('Error fetching email tracking stats:', error);
    throw new Error(`Failed to fetch email tracking stats: ${error.message}`);
  }

  const stats = {
    total: data?.length || 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
  };

  data?.forEach((record) => {
    switch (record.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'sent':
        stats.sent++;
        break;
      case 'delivered':
        stats.delivered++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'bounced':
        stats.bounced++;
        break;
    }
  });

  return stats;
}
