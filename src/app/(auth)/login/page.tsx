'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { SignInFormData } from '@/types/form'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithPhone, sendOTP, signInWithGoogle } = useAuth()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [formData, setFormData] = useState<SignInFormData>({
    phone: '',
    otp_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)


  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const holdStartTimeRef = useRef<number | null>(null)


  useEffect(() => {
    const handleResize = () => {

      if (window.innerHeight < window.screen.height * 0.75) {

        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }, 100)
        }
      }
    }


    window.addEventListener('resize', handleResize)


    const inputs = document.querySelectorAll('input, textarea')
    const handleInputFocus = (e: Event) => {
      setTimeout(() => {
        const target = e.target as HTMLElement
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 300)
    }

    inputs.forEach(input => {
      input.addEventListener('focus', handleInputFocus)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus)
      })
    }
  }, [step])

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

      if (elapsed >= 5000) {
        handleHoldComplete()
      }
    }, 100)
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setGoogleLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      await sendOTP(formData.phone, 'signin')
      setOtpSent(true)
      setStep('otp')
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
      router.push('/')
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

  // const GoogleSignInButton = () => (
  //   <button
  //     type="button"
  //     onClick={handleGoogleSignIn}
  //     disabled={googleLoading || loading}
  //     className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  //   >
  //     {googleLoading ? (
  //       <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
  //     ) : (
  //       <svg className="w-5 h-5" viewBox="0 0 24 24">
  //         <path
  //           fill="#4285F4"
  //           d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
  //         />
  //         <path
  //           fill="#34A853"
  //           d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
  //         />
  //         <path
  //           fill="#FBBC05"
  //           d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
  //         />
  //         <path
  //           fill="#EA4335"
  //           d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
  //         />
  //       </svg>
  //     )}
  //     <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
  //   </button>
  // )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Logo Section - 70% of screen */}
        <div className="w-[70%] bg-gradient-to-br from-[#F2C7EB] to-[#E8A8D8] flex items-center justify-center">
          <div className="text-center">
            {/* Company Logo Placeholder */}
            <div className="w-100 h-100 mx-auto mb-8">
              <img
                src="/assets/the beauty lounge logo.png"
                alt="The Beauty Lounge Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Form Section - 30% of screen */}
        <div className="w-[30%] flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
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

            <div className="bg-white rounded-lg shadow-sm p-6">
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Google Sign-In Button - Only show on phone step */}
              {step === 'phone' && (
                <>
                  {/* <GoogleSignInButton /> */}

                  {/* <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-white text-gray-500">Or continue with phone</span>
                    </div>
                  </div> */}
                </>
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
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto space-y-6 sm:space-y-8">
          {/* Company Logo for Mobile */}
          <div className="w-40 h-40 mx-auto mb-4">
            <img
              src="/assets/the beauty lounge logo.png"
              alt="The Beauty Lounge Logo"
              className="w-full h-full object-contain"
            />
          </div>

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

            {/* Google Sign-In Button - Only show on phone step */}
            {step === 'phone' && (
              <>
                {/* <GoogleSignInButton /> */}

                {/* <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">Or continue with phone</span>
                  </div>
                </div> */}
              </>
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
    </div>
  )
}