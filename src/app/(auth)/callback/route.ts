import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('=== CALLBACK ROUTE START ===')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('Code received:', code ? 'YES' : 'NO')
  console.log('Request URL:', requestUrl.toString())

  if (code) {
    try {
      console.log('Creating Supabase client...')
      const supabase = await createClient()
      
      console.log('Attempting to exchange code for session...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Exchange error:', error.message, error.status, error.name)
        return NextResponse.redirect(new URL(`/?error=${error.message}`, requestUrl.origin))
      }
      
      console.log('Session created:', data.session?.user?.email)
      console.log('User ID:', data.session?.user?.id)
    } catch (err) {
      console.error('Callback exception:', err)
      return NextResponse.redirect(new URL('/?error=exception', requestUrl.origin))
    }
  } else {
    console.log('No code in URL')
  }

  console.log('=== CALLBACK ROUTE END - Redirecting to / ===')
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}