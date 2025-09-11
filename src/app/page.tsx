'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getServicesByCategory, formatPrice, formatDuration } from '@/lib/services'
import { ServiceWithCategory } from '@/types/service'
import { canViewAllAppointments } from '@/lib/rbac'

export default function HomePage() {
  const { user, loading: authLoading, userRoleData } = useAuth()
  const [servicesByCategory, setServicesByCategory] = useState<{ [categoryName: string]: ServiceWithCategory[] }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true)
        const servicesData = await getServicesByCategory()
        setServicesByCategory(servicesData)
      } catch (err) {
        setError('Failed to load services. Please try again.')
        console.error('Error fetching services:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header for non-authenticated users */}
      {!user && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  The Beauty Lounge
                </h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#F2C7EB] text-gray-900 px-4 py-2 rounded-md hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Services
          </h2>
          <p className="mt-3 text-lg text-gray-600 sm:mt-4">
            Choose from our professional beauty and wellness services
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading services...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        ) : Object.keys(servicesByCategory).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No services available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(servicesByCategory)
              .sort(([, servicesA], [, servicesB]) => {
                const orderA = servicesA[0]?.category_display_order || 999
                const orderB = servicesB[0]?.category_display_order || 999
                return orderA - orderB
              })
              .map(([categoryName, categoryServices]) => (
                <div key={categoryName} className="space-y-6">
                  {/* Category Header */}
                  <div className="flex items-center space-x-3">
          <div>
                      <h3 className="text-2xl font-bold text-gray-900">{categoryName}</h3>
                      {categoryServices[0]?.category_description && (
                        <p className="text-gray-600">{categoryServices[0].category_description}</p>
                      )}
                    </div>
          </div>

                  {/* Services Grid for this category */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                  {formatDuration(service.duration_minutes)}
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                  {formatPrice(service.price)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {user ? (
                            <div className="mt-4">
                              <Link
                                href="/appointments"
                                className="block w-full bg-[#F2C7EB] text-gray-900 px-4 py-2 rounded-md hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] transition-colors text-sm font-medium text-center"
                              >
                                Book Appointment
                              </Link>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <Link
                                href="/signup"
                                className="block w-full bg-[#F2C7EB] text-gray-900 px-4 py-2 rounded-md hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB] transition-colors text-sm font-medium text-center"
                              >
                                Sign up to book
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Call to Action */}
        {!user && Object.keys(servicesByCategory).length > 0 && (
          <div className="mt-16 text-center">
            <div className="bg-indigo-50 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to book your appointment?
              </h3>
              <p className="text-gray-600 mb-4">
                Create an account to start booking our services
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}