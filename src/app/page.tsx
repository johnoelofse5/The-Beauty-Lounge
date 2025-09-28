'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getServicesByCategory, formatPrice, formatDuration } from '@/lib/services'
import { ServiceWithCategory } from '@/types/service'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const [servicesByCategory, setServicesByCategory] = useState<{ [categoryName: string]: ServiceWithCategory[] }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

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

  // Set up intersection observer for scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.getAttribute('data-animate-id')
          if (elementId) {
            setVisibleElements(prev => {
              const newSet = new Set(prev)
              if (entry.isIntersecting) {
                newSet.add(elementId)
              } else {
                newSet.delete(elementId)
              }
              return newSet
            })
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Observe elements when they're rendered
  useEffect(() => {
    if (observerRef.current && !loading) {
      const elementsToObserve = document.querySelectorAll('[data-animate-id]')
      elementsToObserve.forEach(element => {
        observerRef.current?.observe(element)
      })
    }
  }, [loading, servicesByCategory])

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
        <div 
          className="text-center mb-12 transition-all duration-700 ease-out"
          data-animate-id="hero"
          style={{
            opacity: visibleElements.has('hero') ? 1 : 0,
            transform: visibleElements.has('hero') ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
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
          <div>
            {/* Sticky Category Navigation Bar */}
            <div 
              className="sticky top-0 z-10 bg-gray-50 py-4 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-700 ease-out"
              data-animate-id="category-nav"
              style={{
                opacity: visibleElements.has('category-nav') ? 1 : 0,
                transform: visibleElements.has('category-nav') ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2">
                {Object.entries(servicesByCategory)
                  .sort(([, servicesA], [, servicesB]) => {
                    const orderA = servicesA[0]?.category_display_order || 999
                    const orderB = servicesB[0]?.category_display_order || 999
                    return orderA - orderB
                  })
                  .map(([categoryName]) => (
                    <button
                      key={categoryName}
                      onClick={() => {
                        const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`)
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap shadow-sm"
                    >
                      {categoryName}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-12">
              {Object.entries(servicesByCategory)
                .sort(([, servicesA], [, servicesB]) => {
                  const orderA = servicesA[0]?.category_display_order || 999
                  const orderB = servicesB[0]?.category_display_order || 999
                  return orderA - orderB
                })
                .map(([categoryName, categoryServices], categoryIndex) => (
                  <div 
                    key={categoryName} 
                    id={`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`} 
                    className="space-y-6"
                    data-animate-id={`category-${categoryName}`}
                    style={{
                      opacity: visibleElements.has(`category-${categoryName}`) ? 1 : 0,
                      transform: visibleElements.has(`category-${categoryName}`) ? 'translateY(0)' : 'translateY(50px)',
                      transition: `all 0.7s ease-out ${categoryIndex * 0.1}s`
                    }}
                  >
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
                    {categoryServices.map((service, serviceIndex) => (
                      <div
                        key={service.id}
                        className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-all duration-500 ease-out"
                        data-animate-id={`service-${service.id}`}
                        style={{
                          opacity: visibleElements.has(`service-${service.id}`) ? 1 : 0,
                          transform: visibleElements.has(`service-${service.id}`) ? 'translateY(0)' : 'translateY(30px)',
                          transition: `all 0.6s ease-out ${(categoryIndex * 0.1) + (serviceIndex * 0.05)}s`
                        }}
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
                                href={`/appointments?serviceId=${service.id}`}
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
          </div>
        )}

        {/* Call to Action */}
        {!user && Object.keys(servicesByCategory).length > 0 && (
          <div 
            className="mt-16 text-center transition-all duration-700 ease-out"
            data-animate-id="cta"
            style={{
              opacity: visibleElements.has('cta') ? 1 : 0,
              transform: visibleElements.has('cta') ? 'translateY(0)' : 'translateY(40px)'
            }}
          >
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