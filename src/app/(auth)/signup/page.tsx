'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { SignUpFormData } from '@/types/form'

export default function SignUpPage() {
  const router = useRouter()
  const { signUpWithPhone, sendOTP } = useAuth()
  const { showError, showSuccess } = useToast()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [formData, setFormData] = useState<SignUpFormData>({
    phone: '',
    first_name: '',
    last_name: '',
    otp_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateForm = (): boolean => {
    if (step === 'form') {
      if (!formData.phone) {
        setError('Phone number is required')
        return false
      }
      if (!validatePhoneNumber(formData.phone)) {
        setError('Please enter a valid phone number (e.g., 0821234567)')
        return false
      }
      if (!formData.first_name) {
        setError('First name is required')
        return false
      }
      if (!formData.last_name) {
        setError('Last name is required')
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
      await sendOTP(formData.phone, 'signup')
      showSuccess('OTP sent successfully! Please check your phone.')
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      // Verify OTP and complete signup
      await signUpWithPhone(formData.phone, formData.first_name, formData.last_name, formData.otp_code || '')
      showSuccess('Account created successfully! Redirecting to login...')
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP and create account'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    // If we're on the form step, send OTP
    if (step === 'form') {
      await handleSendOTP()
    } else {
      // If we're on the OTP step, verify and complete signup
      await handleVerifyOTP()
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return

    setLoading(true)
    setError(null)

    try {
      await sendOTP(formData.phone, 'signup')
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
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Account Created!</h2>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              Your account has been created successfully. You can now sign in.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign up with your mobile number
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'form' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

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
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your mobile number (e.g., 0821234567)
                  </p>
                </div>

                <button
                  type="submit"
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
                    {loading ? 'Creating Account...' : 'Create Account'}
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
                  onClick={() => setStep('form')}
                  className="w-full text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Change details
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
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}