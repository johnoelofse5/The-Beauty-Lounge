'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface TopNavProps {
  title: string
  showViewToggle?: boolean
  viewMode?: 'all' | 'practitioners' | 'clients'
  onViewModeChange?: (mode: 'all' | 'practitioners' | 'clients') => void
  viewModeLabels?: {
    all: string
    practitioners: string
    clients: string
  }
  showServices?: boolean
  showAppointments?: boolean
  showUsers?: boolean
  showRoles?: boolean
  showEmailTracking?: boolean
  showMyAppointments?: boolean
  showHomeLink?: boolean
}

export default function TopNav({
  title,
  showViewToggle = false,
  viewMode = 'all',
  onViewModeChange,
  viewModeLabels = {
    all: 'All Users',
    practitioners: 'Practitioners',
    clients: 'Clients'
  },
  showServices = true,
  showAppointments = true,
  showUsers = true,
  showRoles = false,
  showEmailTracking = false,
  showMyAppointments = false,
  showHomeLink = true
}: TopNavProps) {
  const { signOut } = useAuth()
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleViewModeChange = (mode: 'all' | 'practitioners' | 'clients') => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Left Section - Home Link */}
          <div className="flex items-center space-x-4 w-1/3">
            {showHomeLink && (
              <Link href="/" className="text-[#F2C7EB] hover:text-[#E8A8D8]">
                ← Home
              </Link>
            )}
          </div>
          
          {/* Center Section - Desktop View Toggle or Mobile Title */}
          <div className="hidden md:flex justify-center w-1/3">
            {showViewToggle && onViewModeChange ? (
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'practitioners', 'clients'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleViewModeChange(mode)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {viewModeLabels[mode]}
                  </button>
                ))}
              </div>
            ) : (
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {title}
              </h1>
            )}
          </div>

          {/* Mobile Title */}
          <div className="md:hidden flex justify-center w-1/3">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {title}
            </h1>
          </div>

          {/* Right Section - Desktop Navigation */}
          <div className="hidden md:flex justify-end w-1/3">
            <div className="flex items-center space-x-2">
              {showMyAppointments && (
                <Link
                  href="/appointments-management"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  My Appointments
                </Link>
              )}
              {showServices && (
                <Link
                  href="/services"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  Services
                </Link>
              )}
              {showAppointments && (
                <Link
                  href="/appointments-management"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  Appointments
                </Link>
              )}
              {showUsers && (
                <Link
                  href="/users"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  Users
                </Link>
              )}
              {showRoles && (
                <Link
                  href="/roles"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  Roles
                </Link>
              )}
              {showEmailTracking && (
                <Link
                  href="/email-tracking"
                  className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
                >
                  Email Tracking
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="bg-white text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-[#F6D5F0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex justify-end w-1/3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="px-2 space-y-1">
              {/* Mobile View Mode Toggle */}
              {showViewToggle && onViewModeChange && (
                <div className="px-3 py-2">
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {(['all', 'practitioners', 'clients'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          handleViewModeChange(mode)
                          setShowMobileMenu(false)
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          viewMode === mode
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {mode === 'all' ? 'All' : mode === 'practitioners' ? 'Practitioners' : 'Clients'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {showMyAppointments && (
                <Link
                  href="/appointments-management"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  My Appointments
                </Link>
              )}
              {showServices && (
                <Link
                  href="/services"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Services
                </Link>
              )}
              {showAppointments && (
                <Link
                  href="/appointments-management"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Appointments
                </Link>
              )}
              {showUsers && (
                <Link
                  href="/users"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Users
                </Link>
              )}
              {showRoles && (
                <Link
                  href="/roles"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Roles
                </Link>
              )}
              {showEmailTracking && (
                <Link
                  href="/email-tracking"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Email Tracking
                </Link>
              )}
              <button
                onClick={() => {
                  setShowMobileMenu(false)
                  handleSignOut()
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
