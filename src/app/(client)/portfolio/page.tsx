'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PortfolioService } from '@/lib/portfolio-service'
import { PortfolioWithPractitioner } from '@/types/portfolio'
import { 
  Search, 
  Filter, 
  Star, 
  Calendar, 
  Tag, 
  User,
  Grid,
  List,
  ArrowLeft,
  ChevronDown,
  X
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function PortfolioPage() {
  const { user } = useAuth()
  const { showError } = useToast()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioWithPractitioner[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedImage, setSelectedImage] = useState<PortfolioWithPractitioner | null>(null)
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    loadPortfolioItems()
    loadCategories()
  }, [])

  
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

  const loadPortfolioItems = async () => {
    try {
      const items = await PortfolioService.getAllPortfolioItems()
      setPortfolioItems(items)
    } catch (error) {
      console.error('Error loading portfolio:', error)
      showError('Failed to load portfolio items')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const cats = await PortfolioService.getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
      
      setCategories([])
    }
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
  }

  const filteredItems = portfolioItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.practitioner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.practitioner.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === '' || selectedCategory === 'all' || item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  
  useEffect(() => {
    if (observerRef.current && !loading) {
      const elementsToObserve = document.querySelectorAll('[data-animate-id]')
      elementsToObserve.forEach(element => {
        observerRef.current?.observe(element)
      })
    }
  }, [loading, filteredItems, viewMode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div 
          className="mb-8 transition-all duration-700 ease-out"
          data-animate-id="portfolio-header"
          style={{
            opacity: visibleElements.has('portfolio-header') ? 1 : 0,
            transform: visibleElements.has('portfolio-header') ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Gallery</h1>
          <p className="mt-2 text-gray-600">Discover amazing work from our practitioners</p>
        </div>

        {/* Search and Filters */}
        <div 
          className="bg-white shadow-sm rounded-lg p-6 mb-8 transition-all duration-700 ease-out"
          data-animate-id="search-filters"
          style={{
            opacity: visibleElements.has('search-filters') ? 1 : 0,
            transform: visibleElements.has('search-filters') ? 'translateY(0)' : 'translateY(20px)'
          }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search portfolio items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-48">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 shadow-lg">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div 
          className="mb-6 transition-all duration-700 ease-out"
          data-animate-id="results-count"
          style={{
            opacity: visibleElements.has('results-count') ? 1 : 0,
            transform: visibleElements.has('results-count') ? 'translateY(0)' : 'translateY(15px)'
          }}
        >
          <p className="text-sm text-gray-600">
            Showing {filteredItems.length} of {portfolioItems.length} items
          </p>
        </div>

        {/* Portfolio Items */}
        {filteredItems.length === 0 ? (
          <div 
            className="bg-white shadow-sm rounded-lg p-8 text-center transition-all duration-700 ease-out"
            data-animate-id="empty-state"
            style={{
              opacity: visibleElements.has('empty-state') ? 1 : 0,
              transform: visibleElements.has('empty-state') ? 'translateY(0)' : 'translateY(30px)'
            }}
          >
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div 
            className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "space-y-6"
            }
            data-animate-id="portfolio-grid"
            style={{
              opacity: visibleElements.has('portfolio-grid') ? 1 : 0,
              transform: visibleElements.has('portfolio-grid') ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 0.7s ease-out'
            }}
          >
            {filteredItems.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-all duration-300"
                data-animate-id={`portfolio-item-${item.id}`}
                style={{
                  opacity: visibleElements.has(`portfolio-item-${item.id}`) ? 1 : 0,
                  transform: visibleElements.has(`portfolio-item-${item.id}`) ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s ease-out ${index * 0.1}s`
                }}
              >
                {viewMode === 'grid' ? (
                  
                  <>
                    <div className="relative cursor-pointer" onClick={() => setSelectedImage(item)}>
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                      {item.is_featured && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <User className="h-4 w-4 mr-1" />
                        <span>{item.practitioner.first_name} {item.practitioner.last_name}</span>
                      </div>
                      {item.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mb-2">
                          {item.category}
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </>
                ) : (
                  
                  <div className="flex">
                    <div className="relative w-32 h-32 flex-shrink-0 cursor-pointer" onClick={() => setSelectedImage(item)}>
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                      {item.is_featured && (
                        <div className="absolute top-1 right-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <User className="h-4 w-4 mr-1" />
                        <span>{item.practitioner.first_name} {item.practitioner.last_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {item.category}
                          </span>
                        )}
                        {item.tags && item.tags.slice(0, 5).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-size Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="relative">
                <Image
                  src={selectedImage.image_url}
                  alt={selectedImage.title}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                {selectedImage.is_featured && (
                  <div className="absolute top-4 right-16">
                    <Star className="h-6 w-6 text-yellow-400 fill-current" />
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedImage.title}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(selectedImage.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {selectedImage.description && (
                  <p className="text-gray-600 mb-4">{selectedImage.description}</p>
                )}
                
                <div className="flex items-center text-gray-700 mb-4">
                  <User className="h-5 w-5 mr-2" />
                  <span className="font-medium">{selectedImage.practitioner.first_name} {selectedImage.practitioner.last_name}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedImage.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {selectedImage.category}
                    </span>
                  )}
                  {selectedImage.tags && selectedImage.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
