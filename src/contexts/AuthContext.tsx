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
  signUp: async () => {},
  signIn: async () => {},
  signUpWithPhone: async () => {},
  signInWithPhone: async () => {},
  sendOTP: async () => {},
  verifyOTP: async () => false,
  signOut: async () => {},
  resetPassword: async () => {},
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

  // Load user role data when user changes
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        // Clear any invalid session data
        setSession(null)
        setUser(null)
        setUserRoleData(null)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setUserRoleData(null)
          // Redirect to home page when user signs out
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
    // First, sign up the user with Supabase Auth
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

    // If user was created successfully, create a user record in the database
    if (authData.user) {
      try {
        // Get the client role ID
        const { data: clientRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'client')
          .single()

        if (roleError) {
          console.error('Error fetching client role:', roleError)
          // Continue without role assignment - the database trigger will handle it
        }

        // Create user record in the users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || '',
            phone: userData?.phone || '',
            role_id: clientRole?.id || null, // Assign client role or let trigger handle it
            is_active: true,
            is_deleted: false
          })

        if (userError) {
          console.error('Error creating user record:', userError)
          // Don't throw error here as the auth user was created successfully
          // The database trigger will handle role assignment
        }
      } catch (err) {
        console.error('Error in user creation process:', err)
        // Don't throw error here as the auth user was created successfully
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
        // If the error is about session not found, it means the session is already invalid
        // In this case, we should clear the local state and redirect to login page
        if (error.message.includes('session_not_found') || error.message.includes('Session from session_id claim in JWT does not exist')) {
          console.warn('Session already expired, clearing local state and redirecting to login')
          // Clear local state manually
          setSession(null)
          setUser(null)
          setUserRoleData(null)
          router.push('/login')
          return
        }
        throw new Error(error.message)
      }
      // Redirect to home page after successful sign out
      router.push('/')
    } catch (err) {
      // If there's any error during logout, still clear the local state
      // This ensures the user can't get stuck in a logged-in state
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
      // Create email tracking record
      const tracking = await trackPasswordResetEmail(email, {
        user_email: email,
        reset_requested_at: new Date().toISOString()
      })
      trackingId = tracking.id

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Mark email as failed if there's an error
        if (trackingId) {
          await markEmailAsFailed(trackingId, error.message)
        }
        throw new Error(error.message)
      }

      // Mark email as sent if successful
      if (trackingId) {
        await markEmailAsSent(trackingId)
      }

    } catch (err) {
      // Mark email as failed if there's any error
      if (trackingId) {
        await markEmailAsFailed(trackingId, err instanceof Error ? err.message : 'Unknown error')
      }
      throw err
    }
  }

  // Mobile authentication methods
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

  const signUpWithPhone = async (phone: string, firstName: string, lastName: string, otpCode: string) => {
    // First verify the OTP
    await verifyOTP(phone, otpCode, 'signup')

    // Create a temporary password for Supabase auth (we'll use phone as identifier)
    const tempPassword = `temp_${phone}_${Date.now()}`
    
    // Sign up with Supabase using phone as email identifier
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${phone}@temp.mobile`, // Use phone as email for Supabase compatibility
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

    // If user was created successfully, create a user record in the database
    if (authData.user) {
      try {
        // Get the client role ID
        const { data: clientRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'client')
          .single()

        if (roleError) {
          console.error('Error fetching client role:', roleError)
        }

        // Create user record in the users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: `${phone}@temp.mobile`, // Store phone as email for compatibility
            first_name: firstName,
            last_name: lastName,
            phone: phone,
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

  const signInWithPhone = async (phone: string, otpCode: string) => {
    // First verify the OTP
    await verifyOTP(phone, otpCode, 'signin')

    // Check if user exists in our database
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

    // Use the Edge Function to create a mobile session
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

      // Use the temporary password returned by the Edge Function
      const tempPassword = data.tempPassword
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: tempPassword
      })

      if (signInError) {
        throw new Error('Session creation failed. Please try again.')
      }

      // If we get here, the sign-in was successful
      // The AuthContext will automatically detect the new session
      
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