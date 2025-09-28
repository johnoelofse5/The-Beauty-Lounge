'use client'

import { supabase } from '@/lib/supabase'
import { indexedDBService } from '@/lib/indexeddb-service'
import { Lookup } from '@/types/lookup'
import { LOOKUP_TYPE_CODES, LookupTypeCode } from '@/constants/lookup-codes'

interface LookupQueryOptions {
  useCache?: boolean
  cacheTTL?: number // Time to live in minutes
  forceRefresh?: boolean
}

class LookupServiceCached {
  private readonly CACHE_TTL = 60 // Default cache time in minutes

  // Generic method to fetch lookup data with caching
  private async fetchLookupData(
    typeCode: LookupTypeCode,
    options: LookupQueryOptions = {}
  ): Promise<Lookup[]> {
    const {
      useCache = true,
      cacheTTL = this.CACHE_TTL,
      forceRefresh = false
    } = options

    const cacheKey = `lookup_${typeCode.toLowerCase()}`

    // Try to get from cache first (if caching is enabled and not forcing refresh)
    if (useCache && !forceRefresh) {
      try {
        const cachedData = await indexedDBService.getLookupData(cacheKey)
        if (cachedData && cachedData.length > 0) {
          return cachedData as Lookup[]
        }
      } catch (error) {
        console.warn(`Failed to retrieve ${typeCode} from cache:`, error)
      }
    }

    // Fetch from database using the correct query structure
    try {
      
      // First get the lookup type ID
      const { data: lookupType, error: typeError } = await supabase
        .from('lookup_type')
        .select('id')
        .eq('lookup_type_code', typeCode)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle()

      if (typeError) {
        // If PostgREST says no rows for single(), treat as not found (empty lookups) instead of throwing
        if ((typeError as any).code === 'PGRST116') {
          console.warn(`Lookup type ${typeCode} not found (empty result)`)
          return []
        }
        console.error('Error fetching lookup type:', typeError)
        throw new Error('Failed to fetch lookup type')
      }

      if (!lookupType) {
        console.warn(`Lookup type ${typeCode} not found`)
        return []
      }

      // Then get the lookups for that type
      const { data, error } = await supabase
        .from('lookup')
        .select('*')
        .eq('lookup_type_id', lookupType.id)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching lookups by type code:', error)
        throw new Error('Failed to fetch lookups')
      }

      const lookupData = data || []

      // Store in cache if caching is enabled
      if (useCache && lookupData.length > 0) {
        try {
          await indexedDBService.storeLookupData(cacheKey, lookupData, cacheTTL)
        } catch (cacheError) {
          console.warn(`Failed to cache ${typeCode} data:`, cacheError)
        }
      }

      return lookupData as Lookup[]
    } catch (error) {
      console.error(`Error fetching ${typeCode}:`, error)
      
      // If database fetch fails, try to return cached data as fallback
      if (useCache) {
        try {
          const cachedData = await indexedDBService.getLookupData(cacheKey)
          if (cachedData && cachedData.length > 0) {
            return cachedData as Lookup[]
          }
        } catch (cacheError) {
          console.warn(`Failed to retrieve cached ${typeCode} data as fallback:`, cacheError)
        }
      }
      
      throw error
    }
  }

  // Get hours lookup data
  async getHours(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.HOURS, options)
  }

  // Get time slot intervals lookup data
  async getTimeSlotIntervals(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.TIME_SLOT_INTERVALS, options)
  }

  // Get service categories lookup data
  async getServiceCategories(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.SERVICE_CATEGORIES, options)
  }

  // Get appointment statuses lookup data
  async getAppointmentStatuses(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.APPOINTMENT_STATUS, options)
  }

  // Get user roles lookup data
  async getUserRoles(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.USER_ROLES, options)
  }


  // Clear cache for specific lookup type
  async clearCache(typeCode: LookupTypeCode): Promise<void> {
    try {
      const cacheKey = `lookup_${typeCode.toLowerCase()}`
      await indexedDBService.clearLookupData(cacheKey)
    } catch (error) {
      console.error(`Failed to clear cache for ${typeCode}:`, error)
    }
  }

  // Clear all lookup caches
  async clearAllCaches(): Promise<void> {
    try {
      await indexedDBService.clearAllData()
    } catch (error) {
      console.error('Failed to clear all caches:', error)
    }
  }

  // Refresh specific lookup data (force fetch from database and update cache)
  async refreshLookupData(typeCode: LookupTypeCode): Promise<Lookup[]> {
    return this.fetchLookupData(typeCode, { forceRefresh: true })
  }

  // Get cache status for all lookup types
  async getCacheStatus(): Promise<Record<string, boolean>> {
    const lookupTypes = [
      LOOKUP_TYPE_CODES.HOURS,
      LOOKUP_TYPE_CODES.TIME_SLOT_INTERVALS,
      LOOKUP_TYPE_CODES.SERVICE_CATEGORIES,
      LOOKUP_TYPE_CODES.APPOINTMENT_STATUS
    ]

    const status: Record<string, boolean> = {}

    for (const typeCode of lookupTypes) {
      try {
        const cacheKey = `lookup_${typeCode.toLowerCase()}`
        const hasData = await indexedDBService.hasFreshLookupData(cacheKey)
        status[typeCode] = hasData
      } catch (error) {
        console.warn(`Failed to check cache status for ${typeCode}:`, error)
        status[typeCode] = false
      }
    }

    return status
  }

  // Preload all lookup data into cache
  async preloadAllLookups(): Promise<void> {
    const lookupTypes = [
      LOOKUP_TYPE_CODES.HOURS,
      LOOKUP_TYPE_CODES.TIME_SLOT_INTERVALS,
      LOOKUP_TYPE_CODES.SERVICE_CATEGORIES,
      LOOKUP_TYPE_CODES.APPOINTMENT_STATUS,
      LOOKUP_TYPE_CODES.MEASUREMENTS,
      LOOKUP_TYPE_CODES.PAYMENT_METHODS,
      LOOKUP_TYPE_CODES.REVENUE_TYPES,
      LOOKUP_TYPE_CODES.TRANSACTION_TYPES
    ]

    
    const preloadPromises = lookupTypes.map(async (typeCode) => {
      try {
        await this.fetchLookupData(typeCode, { useCache: true, forceRefresh: false })
      } catch (error) {
        console.error(`Failed to preload ${typeCode}:`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  // Get lookup data with fallback to default values
  async getLookupWithFallback(
    typeCode: LookupTypeCode,
    fallbackData: Lookup[],
    options: LookupQueryOptions = {}
  ): Promise<Lookup[]> {
    try {
      return await this.fetchLookupData(typeCode, options)
    } catch (error) {
      console.warn(`Using fallback data for ${typeCode}:`, error)
      return fallbackData
    }
  }

  // Convenience method for getting measurements
  async getMeasurements(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.MEASUREMENTS, { 
      useCache: true,
      ...options 
    })
  }

  // Convenience method for getting payment methods
  async getPaymentMethods(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.PAYMENT_METHODS, { 
      useCache: true,
      ...options 
    })
  }

  // Convenience method for getting revenue types
  async getRevenueTypes(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.REVENUE_TYPES, { 
      useCache: true,
      ...options 
    })
  }

  // Convenience method for getting transaction types
  async getTransactionTypes(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.TRANSACTION_TYPES, { 
      useCache: true,
      ...options 
    })
  }
}

// Export singleton instance
export const lookupServiceCached = new LookupServiceCached()

// Initialize IndexedDB and preload data when the service is imported
if (typeof window !== 'undefined') {
  // Initialize IndexedDB
  indexedDBService.init().then(() => {
    // Preload critical lookup data
    lookupServiceCached.preloadAllLookups().catch(error => {
      console.error('Failed to preload lookup data:', error)
    })
  }).catch(error => {
    console.error('Failed to initialize IndexedDB for lookup service:', error)
  })
}
