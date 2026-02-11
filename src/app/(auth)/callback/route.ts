import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('=== CALLBACK ROUTE START ===') 
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('Code received:', code ? 'YES' : 'NO')

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Exchange error:', error)
        return NextResponse.redirect(new URL(`/?error=${error.message}`, requestUrl.origin))
      }
      
      console.log('Session created:', data.session?.user?.email)
    } catch (err) {
      console.error('Callback exception:', err)
      return NextResponse.redirect(new URL('/?error=exception', requestUrl.origin))
    }
  }

  console.log('=== Redirecting to /?refresh=1 ===')
  return NextResponse.redirect(new URL('/?refresh=1', requestUrl.origin))
}