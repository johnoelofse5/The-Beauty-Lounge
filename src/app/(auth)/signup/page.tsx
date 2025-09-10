'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { SignUpFormData } from '@/types/form'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Please fill in all required fields')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
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
      await signUp(formData.email, formData.password, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup')
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
              Please check your email to verify your account, then you can sign in.
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
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Or{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 underline">
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
              <div className="text-sm text-red-700 sm:text-base">{error}</div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  First Name *
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Last Name *
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Phone number (optional)"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Password (min. 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 