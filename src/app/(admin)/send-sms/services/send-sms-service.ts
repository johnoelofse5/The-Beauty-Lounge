import { createClient } from '@/lib/supabase/client';
import type { Recipient } from '../types/send-sms';

export async function fetchRecipients(excludeUserId: string): Promise<Recipient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email, phone, is_active, is_deleted')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .neq('id', excludeUserId)
    .order('first_name');

  if (error) throw new Error('Failed to load users');

  return (data ?? []).map((u) => ({
    id: u.id,
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
  }));
}

export async function sendBulkSms(message: string, userIds: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.functions.invoke('send-bulk-sms', {
    body: { message, user_ids: userIds },
  });
  if (error) throw error;
}
