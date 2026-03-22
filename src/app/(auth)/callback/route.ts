import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Exchange error:', error);
        return NextResponse.redirect(new URL(`/?error=${error.message}`, requestUrl.origin));
      }
    } catch (err) {
      console.error('Callback exception:', err);
      return NextResponse.redirect(new URL('/?error=exception', requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/?refresh=1', requestUrl.origin));
}
