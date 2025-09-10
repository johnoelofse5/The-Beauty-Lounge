'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, userData?: UserSignUpData) => {
    const { error } = await supabase.auth.signUp({
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

    if (error) {
      throw new Error(error.message)
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
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading,
      userRoleData,
      signUp, 
      signIn, 
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}