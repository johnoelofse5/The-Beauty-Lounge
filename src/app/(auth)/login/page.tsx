'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { SignInFormData } from '@/types/form'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithPhone, sendOTP } = useAuth()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [formData, setFormData] = useState<SignInFormData>({
    phone: '',
    otp_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  // Hold functionality for legacy login (hidden)
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const holdStartTimeRef = useRef<number | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleHoldStart = () => {
    holdStartTimeRef.current = Date.now()
    
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (holdStartTimeRef.current || 0)
      
      if (elapsed >= 5000) { // 5 seconds
        handleHoldComplete()
      }
    }, 100) // Check every 100ms
  }

  const handleHoldEnd = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    holdStartTimeRef.current = null
  }

  const handleHoldComplete = () => {
    handleHoldEnd()
    router.push('/legacy-login')
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateForm = (): boolean => {
    if (step === 'phone') {
      if (!formData.phone) {
        setError('Phone number is required')
        return false
      }
      if (!validatePhoneNumber(formData.phone)) {
        setError('Please enter a valid phone number (e.g., 0821234567)')
        return false
      }
    } else if (step === 'otp') {
      if (!formData.otp_code) {
        setError('OTP code is required')
        return false
      }
      if (!/^\d{6}$/.test(formData.otp_code)) {
        setError('OTP code must be 6 digits')
        return false
      }
    }

    return true
  }

  const handleSendOTP = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      await sendOTP(formData.phone, 'signin')
      setOtpSent(true)
      setStep('otp')
      setCountdown(60) // 60 seconds countdown
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      await signInWithPhone(formData.phone, formData.otp_code || '')
      router.push('/') // Redirect to home page after successful login
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return

    setLoading(true)
    setError(null)

    try {
      await sendOTP(formData.phone, 'signin')
      setCountdown(60)
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 
            className="text-3xl font-bold text-gray-900"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
          >
            Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your mobile number
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'phone' && (
              <>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <div className="mt-1">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0821234567"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your mobile number (e.g., 0821234567)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div>
                  <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div className="mt-1">
                    <input
                      id="otp_code"
                      name="otp_code"
                      type="text"
                      required
                      maxLength={6}
                      value={formData.otp_code}
                      onChange={handleInputChange}
                      placeholder="123456"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-lg tracking-widest"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the 6-digit code sent to {formData.phone}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading || countdown > 0}
                    className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Change phone number
                </button>
              </>
            )}
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/signup"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}