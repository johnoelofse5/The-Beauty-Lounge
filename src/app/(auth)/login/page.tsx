'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { SignInFormData } from '@/types/form'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      router.push('/') // Redirect to home page after successful login
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Or{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500 underline">
              create a new account
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Email Address
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 underline"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 