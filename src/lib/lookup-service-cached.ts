'use client'

import { supabase } from '@/lib/supabase'
import { indexedDBService } from '@/lib/indexeddb-service'
import { Lookup } from '@/types/lookup'
import { LOOKUP_TYPE_CODES, LookupTypeCode } from '@/constants/lookup-codes'

interface LookupQueryOptions {
  useCache?: boolean
  cacheTTL?: number 
  forceRefresh?: boolean
}

class LookupServiceCached {
  private readonly CACHE_TTL = 60 

  
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

    
    try {
      
      
      const { data: lookupType, error: typeError } = await supabase
        .from('lookup_type')
        .select('id')
        .eq('lookup_type_code', typeCode)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle()

      if (typeError) {
        
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

  
  async getHours(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.HOURS, options)
  }

  
  async getTimeSlotIntervals(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.TIME_SLOT_INTERVALS, options)
  }

  
  async getServiceCategories(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.SERVICE_CATEGORIES, options)
  }

  
  async getAppointmentStatuses(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.APPOINTMENT_STATUS, options)
  }

  
  async getUserRoles(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.USER_ROLES, options)
  }


  
  async clearCache(typeCode: LookupTypeCode): Promise<void> {
    try {
      const cacheKey = `lookup_${typeCode.toLowerCase()}`
      await indexedDBService.clearLookupData(cacheKey)
    } catch (error) {
      console.error(`Failed to clear cache for ${typeCode}:`, error)
    }
  }

  
  async clearAllCaches(): Promise<void> {
    try {
      await indexedDBService.clearAllData()
    } catch (error) {
      console.error('Failed to clear all caches:', error)
    }
  }

  
  async refreshLookupData(typeCode: LookupTypeCode): Promise<Lookup[]> {
    return this.fetchLookupData(typeCode, { forceRefresh: true })
  }

  
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

  
  async getMeasurements(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.MEASUREMENTS, { 
      useCache: true,
      ...options 
    })
  }

  
  async getPaymentMethods(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.PAYMENT_METHODS, { 
      useCache: true,
      ...options 
    })
  }

  
  async getRevenueTypes(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.REVENUE_TYPES, { 
      useCache: true,
      ...options 
    })
  }

  
  async getTransactionTypes(options: LookupQueryOptions = {}): Promise<Lookup[]> {
    return this.fetchLookupData(LOOKUP_TYPE_CODES.TRANSACTION_TYPES, { 
      useCache: true,
      ...options 
    })
  }
}


export const lookupServiceCached = new LookupServiceCached()


if (typeof window !== 'undefined') {
  
  indexedDBService.init().then(() => {
    
    lookupServiceCached.preloadAllLookups().catch(error => {
      console.error('Failed to preload lookup data:', error)
    })
  }).catch(error => {
    console.error('Failed to initialize IndexedDB for lookup service:', error)
  })
}
