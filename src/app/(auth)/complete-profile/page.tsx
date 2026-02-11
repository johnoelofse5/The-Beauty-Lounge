'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CompleteProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.given_name || '',
    lastName: user?.user_metadata?.family_name || '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const { data: clientRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'client')
      .single()

    if (roleError) {
      throw new Error('Failed to fetch role')
    }

    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: user!.id,
        email: user!.email || '',
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        role_id: clientRole?.id || null,
        is_active: true,
        is_deleted: false
      }, {
        onConflict: 'id'
      })

    if (userError) {
      throw new Error('Failed to save profile')
    }

    router.push('/')
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred')
  } finally {
    setLoading(false)
  }
}

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-gray-600 mb-6">
          We need a bit more information to set up your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="+27 XX XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}