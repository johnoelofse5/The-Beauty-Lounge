'use client'

import { useState } from 'react'
import { useIndexedDBCache } from '@/hooks/useIndexedDBCache'
import { lookupServiceCached } from '@/lib/lookup-service-cached'
import { 
  Trash2, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock,
  HardDrive
} from 'lucide-react'
import { LookupTypeCode } from '@/constants/lookup-codes'

interface CacheManagementProps {
  className?: string
}

export const CacheManagement = ({ className = '' }: CacheManagementProps) => {
  const { 
    cacheStatus, 
    cleanupExpiredCache, 
    clearAllCache, 
    clearLookupCache 
  } = useIndexedDBCache()
  
  const [cacheStatusData, setCacheStatusData] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleRefreshCacheStatus = async () => {
    setIsRefreshing(true)
    try {
      const status = await lookupServiceCached.getCacheStatus()
      setCacheStatusData(status)
    } catch (error) {
      console.error('Failed to refresh cache status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClearAllCache = async () => {
    if (!confirm('Are you sure you want to clear all cached data? This will force all lookups to be fetched from the database on next request.')) {
      return
    }

    setIsClearing(true)
    try {
      await clearAllCache()
      await handleRefreshCacheStatus()
    } catch (error) {
      console.error('Failed to clear all cache:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearSpecificCache = async (lookupType: string) => {
    if (!confirm(`Are you sure you want to clear the cache for ${lookupType}?`)) {
      return
    }

    try {
      await lookupServiceCached.clearCache(lookupType as LookupTypeCode)
      await handleRefreshCacheStatus()
    } catch (error) {
      console.error(`Failed to clear cache for ${lookupType}:`, error)
    }
  }

  const handleCleanupExpired = async () => {
    try {
      await cleanupExpiredCache()
      await handleRefreshCacheStatus()
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error)
    }
  }

  const lookupTypes = [
    { key: 'HOURS', name: 'Hours' },
    { key: 'TIME_SLOT_INTERVALS', name: 'Time Slot Intervals' },
    { key: 'SERVICE_CATEGORIES', name: 'Service Categories' },
    { key: 'APPOINTMENT_STATUS', name: 'Appointment Statuses' },
    { key: 'USER_ROLES', name: 'User Roles' },
  ]

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <HardDrive className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Cache Management</h3>
        </div>
        <button
          onClick={handleRefreshCacheStatus}
          disabled={isRefreshing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Cache Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">IndexedDB Status</span>
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {cacheStatus.isAvailable ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Available</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Unavailable</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Last Cleanup</span>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              {cacheStatus.lastCleanup 
                ? new Date(cacheStatus.lastCleanup).toLocaleTimeString()
                : 'Never'
              }
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Cached Lookups</span>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              {Object.values(cacheStatusData).filter(Boolean).length} / {lookupTypes.length}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Lookup Cache Status */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Lookup Cache Status</h4>
        <div className="space-y-2">
          {lookupTypes.map(({ key, name }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {cacheStatusData[key] ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">{name}</span>
              </div>
              <button
                onClick={() => handleClearSpecificCache(key)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCleanupExpired}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Clock className="h-4 w-4 mr-2" />
          Cleanup Expired
        </button>
        
        <button
          onClick={handleClearAllCache}
          disabled={isClearing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Clearing...' : 'Clear All Cache'}
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Clearing cache will force all lookup data to be fetched from the database on the next request. 
          This may temporarily slow down the application but ensures you have the most up-to-date data.
        </p>
      </div>
    </div>
  )
}
