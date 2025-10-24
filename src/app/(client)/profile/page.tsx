'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ValidationInput } from '@/components/validation/ValidationComponents'

interface ProfileData {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, userRoleData } = useAuth()
  const { showSuccess, showError } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    email: user?.email || '',
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, created_at, updated_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        showError('Failed to load profile data')
        return
      }

      setProfileData(data)
      setFormData({
        email: user?.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      showError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))


    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSave = async () => {
    if (!user || !profileData) return

    setSaving(true)

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setFormErrors({ email: 'Please enter a valid email address' })
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          phone: formData.phone || null,
          email: formData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        showError('Failed to update profile')
        return
      }

      if (formData.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: formData.email })
        if (authError) {
          console.error('Error updating auth email:', authError)
          showError('Profile updated, but failed to update email in authentication. Please try again.')
          return
        }
        showSuccess('Profile updated! Please check your new email for confirmation to complete the email change.')
      } else {
        showSuccess('Profile updated successfully!')
      }

      setIsEditing(false)
      await loadProfileData()
    } catch (err) {
      console.error('Error updating profile:', err)
      showError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profileData) {
      setFormData({
        email: profileData.email || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone: profileData.phone || '',
      })
    }
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-500 mt-2 inline-block">
            Return to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your personal information</p>
        </div>

        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8 sm:px-8">
            {/* Profile Header */}
            <div className="flex items-center mb-8">
              <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {profileData.first_name && profileData.last_name
                    ? `${profileData.first_name} ${profileData.last_name}`
                    : profileData.email
                  }
                </h2>
                <p className="text-gray-600">{profileData.email}</p>
                {userRoleData?.role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                    {userRoleData.role.name}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <ValidationInput
                    label="First Name"
                    error={formErrors.first_name}
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                  />
                </div>

                <div>
                  <ValidationInput
                    label="Last Name"
                    error={formErrors.last_name}
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <ValidationInput
                  label="Email Address"
                  error={formErrors.email}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your email address"
                />
                <ValidationInput
                  label="Phone Number"
                  error={formErrors.phone}
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Member since</p>
                    <p className="text-sm text-gray-500">
                      {new Date(profileData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last updated</p>
                    <p className="text-sm text-gray-500">
                      {new Date(profileData.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
