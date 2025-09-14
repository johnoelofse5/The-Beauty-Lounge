'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PortfolioService } from '@/lib/portfolio-service'
import { PortfolioItem } from '@/types/portfolio'
import { ValidationService } from '@/lib/validation-service'
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Star, 
  StarOff, 
  Image as ImageIcon,
  Calendar,
  Tag,
  ArrowLeft,
  ChevronDown
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ValidationInput, 
  ValidationTextarea, 
  ValidationSelect, 
  ValidationFileInput 
} from '@/components/validation/ValidationComponents'

export default function PortfolioManagementPage() {
  const { user, userRoleData } = useAuth()
  const { showSuccess, showError } = useToast()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    is_featured: false
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      loadPortfolioItems()
      loadCategories()
    }
  }, [user])

  const loadPortfolioItems = async () => {
    if (!user) return

    try {
      const items = await PortfolioService.getPractitionerPortfolio(user.id)
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
      const dbCategories = await PortfolioService.getCategories()
      setCategories(dbCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
      // If database fails, show empty categories
      setCategories([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }))
    
    // Clear error when user selects
    if (formErrors.category) {
      setFormErrors(prev => ({ ...prev, category: '' }))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate image file using the validation service
      const imageError = ValidationService.validateImage(file, { required: true })
      if (imageError) {
        setFormErrors(prev => ({ ...prev, image: imageError }))
        return
      }

      setImageFile(file)
      
      // Clear error if validation passes
      if (formErrors.image) {
        setFormErrors(prev => ({ ...prev, image: '' }))
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate form data
    const validationResult = ValidationService.validateForm(formData, ValidationService.schemas.portfolio)
    if (!validationResult.isValid) {
      setFormErrors(validationResult.errors)
      return
    }

    // Validate image file
    if (!imageFile) {
      setFormErrors(prev => ({ ...prev, image: 'Image is required' }))
      return
    }
    
    const imageError = ValidationService.validateImage(imageFile, { required: true })
    if (imageError) {
      setFormErrors(prev => ({ ...prev, image: imageError }))
      return
    }

    setUploading(true)

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)

      if (editingItem) {
        // Update existing item
        await PortfolioService.updatePortfolioItem(editingItem.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: tags,
          is_featured: formData.is_featured
        })
        showSuccess('Portfolio item updated successfully!')
      } else {
        // Create new item
        await PortfolioService.createPortfolioItem(user.id, imageFile!, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: tags,
          is_featured: formData.is_featured
        })
        showSuccess('Portfolio item added successfully!')
      }

      resetForm()
      await loadPortfolioItems()
    } catch (error) {
      console.error('Error saving portfolio item:', error)
      showError('Failed to save portfolio item')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category || '',
      tags: item.tags?.join(', ') || '',
      is_featured: item.is_featured
    })
    setImagePreview(item.image_url)
    setShowAddForm(true)
  }

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return

    try {
      await PortfolioService.deletePortfolioItem(item.id)
      showSuccess('Portfolio item deleted successfully!')
      await loadPortfolioItems()
    } catch (error) {
      console.error('Error deleting portfolio item:', error)
      showError('Failed to delete portfolio item')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: '',
      is_featured: false
    })
    setImageFile(null)
    setImagePreview(null)
    setEditingItem(null)
    setShowAddForm(false)
  }

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
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
              <p className="mt-2 text-gray-600">Manage your work portfolio</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true)
                // Clear any existing errors when opening the form
                setFormErrors({})
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white shadow-sm rounded-lg mb-8">
            <div className="px-6 py-8 sm:px-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingItem ? 'Edit Portfolio Item' : 'Add New Portfolio Item'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <ValidationInput
                      label="Title"
                      required
                      error={formErrors.title}
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter title"
                    />
                  </div>

                  <div>
                    <ValidationSelect
                      label="Category"
                      error={formErrors.category}
                      value={formData.category}
                      onValueChange={handleSelectChange}
                      placeholder="Select category"
                    >
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </ValidationSelect>
                  </div>
                </div>

                <div>
                  <ValidationTextarea
                    label="Description"
                    error={formErrors.description}
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <ValidationInput
                    label="Tags"
                    error={formErrors.tags}
                    name="tags"
                    type="text"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="Enter tags separated by commas"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
                </div>

                <div>
                  <ValidationFileInput
                    label="Image"
                    required={!editingItem}
                    error={formErrors.image}
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="mt-4">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    id="is_featured"
                    name="is_featured"
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900">
                    Featured item
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingItem ? 'Updating...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Portfolio Grid */}
        {portfolioItems.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolio items yet</h3>
            <p className="text-gray-600 mb-4">Start building your portfolio by adding your work</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {portfolioItems.map((item) => (
              <div key={item.id} className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="relative">
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
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  )}
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
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
