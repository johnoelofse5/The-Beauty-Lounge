'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      } else {
        // Try to get session from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (!error) {
            setIsValidSession(true)
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
          }
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      }
    }

    checkSession()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'password') {
      setPassword(value)
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value)
    }
    
    if (error) setError(null) // Clear error when user starts typing
  }

  const validateForm = (): boolean => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw new Error(error.message)
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Password Updated!</h2>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              Your password has been successfully updated. You will be redirected to the sign-in page shortly.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Invalid Reset Link</h2>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/forgot-password"
                className="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Request New Reset Link
              </Link>
              <Link
                href="/login"
                className="w-full flex justify-center py-3 sm:py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-base sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Set your new password
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Enter your new password below.
          </p>
        </div>

        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
              <div className="text-sm text-red-700 sm:text-base">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={handleInputChange}
              className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Enter your new password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={handleInputChange}
              className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Confirm your new password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 sm:text-base">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
