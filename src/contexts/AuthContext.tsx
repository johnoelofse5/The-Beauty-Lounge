'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { AuthContextType } from '@/types/auth-context-type'
import { UserSignUpData } from '@/types/user-signup'
import { supabase } from '@/lib/supabase'
import { getUserRoleAndPermissions, UserWithRoleAndPermissions } from '@/lib/rbac'
import { trackPasswordResetEmail, markEmailAsSent, markEmailAsFailed } from '@/lib/email-tracking'

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRoleData: null,
  signUp: async () => { },
  signIn: async () => { },
  signUpWithPhone: async () => { },
  signInWithPhone: async () => { },
  sendOTP: async () => { },
  verifyOTP: async () => false,
  signOut: async () => { },
  resetPassword: async () => { },
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRoleData, setUserRoleData] = useState<UserWithRoleAndPermissions | null>(null)


  useEffect(() => {
    const loadUserRoleData = async () => {
      if (user?.id) {
        const roleData = await getUserRoleAndPermissions(user.id)
        setUserRoleData(roleData)
      } else {
        setUserRoleData(null)
      }
    }

    loadUserRoleData()
  }, [user])

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)

        setSession(null)
        setUser(null)
        setUserRoleData(null)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })


    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setUserRoleData(null)

          router.push('/')
        } else if (event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_IN') {
          setSession(session)
          setUser(session?.user ?? null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const signUp = async (email: string, password: string, userData?: UserSignUpData) => {

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData?.first_name || '',
          last_name: userData?.last_name || '',
          phone: userData?.phone || '',
        }
      }
    })

    if (authError) {
      throw new Error(authError.message)
    }


    if (authData.user) {
      try {

        const { data: clientRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'client')
          .single()

        if (roleError) {
          console.error('Error fetching client role:', roleError)

        }


        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || '',
            phone: userData?.phone || '',
            role_id: clientRole?.id || null,
            is_active: true,
            is_deleted: false
          })

        if (userError) {
          console.error('Error creating user record:', userError)


        }
      } catch (err) {
        console.error('Error in user creation process:', err)

      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {


        if (error.message.includes('session_not_found') || error.message.includes('Session from session_id claim in JWT does not exist')) {
          console.warn('Session already expired, clearing local state and redirecting to login')

          setSession(null)
          setUser(null)
          setUserRoleData(null)
          router.push('/login')
          return
        }
        throw new Error(error.message)
      }

      router.push('/')
    } catch (err) {


      console.error('Error during logout:', err)
      setSession(null)
      setUser(null)
      setUserRoleData(null)
      router.push('/login')
    }
  }

  const resetPassword = async (email: string) => {
    let trackingId: string | null = null

    try {

      const tracking = await trackPasswordResetEmail(email, {
        user_email: email,
        reset_requested_at: new Date().toISOString()
      })
      trackingId = tracking.id


      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {

        if (trackingId) {
          await markEmailAsFailed(trackingId, error.message)
        }
        throw new Error(error.message)
      }


      if (trackingId) {
        await markEmailAsSent(trackingId)
      }

    } catch (err) {

      if (trackingId) {
        await markEmailAsFailed(trackingId, err instanceof Error ? err.message : 'Unknown error')
      }
      throw err
    }
  }


  const sendOTP = async (phone: string, purpose: 'signup' | 'signin' | 'password_reset') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phoneNumber: phone, purpose }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to send OTP')
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send OTP')
    }
  }

  const verifyOTP = async (phone: string, otpCode: string, purpose: 'signup' | 'signin' | 'password_reset'): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phoneNumber: phone, otpCode, purpose }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to verify OTP')
      }

      return true
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to verify OTP')
    }
  }

  const signUpWithPhone = async (phone: string, email: string, firstName: string, lastName: string, otpCode: string) => {

    await verifyOTP(phone, otpCode, 'signup')


    const tempPassword = `temp_${phone}_${Date.now()}`


    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        data: {
          phone: phone,
          first_name: firstName,
          last_name: lastName,
        }
      }
    })

    if (authError) {
      throw new Error(authError.message)
    }


    if (authData.user) {

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, phone, first_name, last_name')
        .eq('id', authData.user.id)
        .single()

      if (existingUser && !checkError && existingUser?.phone === phone) {
        throw new Error('User already exists with this phone number. Please try logging in instead.')
      }
      if (
        typeof existingUser?.phone === "string" &&
        existingUser?.phone.trim() &&
        existingUser?.phone !== phone
      ) {
        throw new Error('User already exists with a different phone number. Please contact support.')
      }


      const { data: clientRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'client')
        .single()

      if (roleError) {
        console.error('Error fetching client role:', roleError)

      }



      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          role_id: clientRole?.id || null,
          is_active: true,
          is_deleted: false
        }, {
          onConflict: 'id'
        })

      if (userError) {

        if (userError.code === '23505') {
          throw new Error('User already exists. Please try logging in instead.')
        } else if (userError.code === '42703') {
          throw new Error('Database error: missing required columns. Please contact support.')
        } else {
          throw new Error('Database error saving new user')
        }
      }
    }
  }

  const signInWithPhone = async (phone: string, otpCode: string) => {

    await verifyOTP(phone, otpCode, 'signin')


    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      throw new Error('User not found. Please sign up first.')
    }


    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-mobile-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: userData.id,
          email: userData.email,
          phone: phone
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to create session')
      }


      const tempPassword = data.tempPassword

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: tempPassword
      })

      if (signInError) {
        throw new Error('Session creation failed. Please try again.')
      }




    } catch (error) {
      throw new Error('Authentication failed. Please try again.')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRoleData,
      signUp,
      signIn,
      signUpWithPhone,
      signInWithPhone,
      sendOTP,
      verifyOTP,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}