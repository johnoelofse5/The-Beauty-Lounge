'use client'

import { useState, useEffect, useCallback } from 'react'
import { indexedDBService } from '@/lib/indexeddb-service'

interface CacheStatus {
  isInitialized: boolean
  isAvailable: boolean
  lastCleanup: number | null
}

export const useIndexedDBCache = () => {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isInitialized: false,
    isAvailable: false,
    lastCleanup: null
  })

  // Initialize IndexedDB
  useEffect(() => {
    const initializeCache = async () => {
      try {
        await indexedDBService.init()
        setCacheStatus(prev => ({
          ...prev,
          isInitialized: true,
          isAvailable: true
        }))
        
        // Clean up expired cache entries on initialization
        await cleanupExpiredCache()
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error)
        setCacheStatus(prev => ({
          ...prev,
          isInitialized: true,
          isAvailable: false
        }))
      }
    }

    initializeCache()
  }, [])

  // Clean up expired cache entries
  const cleanupExpiredCache = useCallback(async () => {
    try {
      await indexedDBService.cleanupExpiredCache()
      setCacheStatus(prev => ({
        ...prev,
        lastCleanup: Date.now()
      }))
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error)
    }
  }, [])

  // Clear all cache data
  const clearAllCache = useCallback(async () => {
    try {
      await indexedDBService.clearAllData()
    } catch (error) {
      console.error('Failed to clear all cache:', error)
    }
  }, [])

  // Clear specific lookup cache
  const clearLookupCache = useCallback(async (lookupType: string) => {
    try {
      await indexedDBService.clearLookupData(lookupType)
    } catch (error) {
      console.error(`Failed to clear cache for ${lookupType}:`, error)
    }
  }, [])

  // Store data in cache
  const storeCacheData = useCallback(async (
    key: string, 
    data: any, 
    ttlMinutes: number = 60
  ) => {
    try {
      await indexedDBService.storeCacheData(key, data, ttlMinutes)
    } catch (error) {
      console.error(`Failed to store cache data for ${key}:`, error)
    }
  }, [])

  // Retrieve data from cache
  const getCacheData = useCallback(async (key: string) => {
    try {
      return await indexedDBService.getCacheData(key)
    } catch (error) {
      console.error(`Failed to retrieve cache data for ${key}:`, error)
      return null
    }
  }, [])

  // Remove specific cache data
  const removeCacheData = useCallback(async (key: string) => {
    try {
      await indexedDBService.removeCacheData(key)
    } catch (error) {
      console.error(`Failed to remove cache data for ${key}:`, error)
    }
  }, [])

  return {
    cacheStatus,
    cleanupExpiredCache,
    clearAllCache,
    clearLookupCache,
    storeCacheData,
    getCacheData,
    removeCacheData
  }
}
