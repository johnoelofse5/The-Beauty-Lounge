import { supabase } from './supabase'
import { Service, ServiceWithCategory } from '@/types/service'
import { Category } from '@/types/service-category'

export async function getServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getServices:', error)
    return []
  }
}

export async function getServicesWithCategories(): Promise<ServiceWithCategory[]> {
  try {
    const { data, error } = await supabase
      .from('services_with_categories')
      .select('*')

    if (error) {
      console.error('Error fetching services with categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getServicesWithCategories:', error)
    return []
  }
}

export async function getServicesByCategory(): Promise<{ [categoryName: string]: ServiceWithCategory[] }> {
  try {
    const services = await getServicesWithCategories()
    
    
    const servicesByCategory: { [categoryName: string]: ServiceWithCategory[] } = {}
    
    services.forEach(service => {
      const categoryName = service.category_name || 'Uncategorized'
      if (!servicesByCategory[categoryName]) {
        servicesByCategory[categoryName] = []
      }
      servicesByCategory[categoryName].push(service)
    })
    
    return servicesByCategory
  } catch (error) {
    console.error('Error in getServicesByCategory:', error)
    return {}
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getCategories:', error)
    return []
  }
}

export async function getServiceById(id: string): Promise<Service | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching service:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getServiceById:', error)
    return null
  }
}

export function formatPrice(price: number | null | undefined): string {
  if (!price) return 'Contact for pricing'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ZAR',
  }).format(price)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${remainingMinutes} min`
} 