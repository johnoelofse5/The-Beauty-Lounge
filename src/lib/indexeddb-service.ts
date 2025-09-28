'use client'

interface LookupData {
  id: string
  value: string
  secondary_value?: string
  description?: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface StoredLookup {
  data: LookupData[]
  lastUpdated: number
  expiresAt: number
}

class IndexedDBService {
  private dbName = 'BeautyLoungeDB'
  private version = 3
  private db: IDBDatabase | null = null

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        const lookupTypes = [
          'lookup_hours',
          'lookup_time_slot_intervals',
          'lookup_service_categories',
          'lookup_appointment_status',
          'lookup_user_roles',
          'lookup_measurements',
          'lookup_payment_methods',
          'lookup_revenue_types',
          'lookup_transaction_types'
        ]

        lookupTypes.forEach(type => {
          if (!db.objectStoreNames.contains(type)) {
            const store = db.createObjectStore(type, { keyPath: 'id' })
            store.createIndex('value', 'value', { unique: false })
            store.createIndex('is_active', 'is_active', { unique: false })
            store.createIndex('display_order', 'display_order', { unique: false })
          }
        })

        // Create a general cache store for any data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })
  }

  // Store lookup data with expiration
  async storeLookupData(
    type: string, 
    data: LookupData[], 
    ttlMinutes: number = 60
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    // Check if object store exists, if not, we need to recreate the database
    if (!this.db || !this.db.objectStoreNames.contains(type)) {
      console.warn(`Object store ${type} not found, recreating database...`)
      await this.recreateDatabase()
      if (!this.db) {
        throw new Error('Failed to recreate database')
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readwrite')
      const store = transaction.objectStore(type)
      
      const expiresAt = Date.now() + (ttlMinutes * 60 * 1000)
      const storedData: StoredLookup = {
        data,
        lastUpdated: Date.now(),
        expiresAt
      }

      // Clear existing data first
      store.clear().onsuccess = () => {
        // Add new data
        data.forEach(item => {
          store.add(item)
        })

        transaction.oncomplete = () => {
          resolve()
        }

        transaction.onerror = () => {
          console.error(`Failed to store ${type} data:`, transaction.error)
          reject(transaction.error)
        }
      }
    })
  }

  // Retrieve lookup data
  async getLookupData(type: string): Promise<LookupData[] | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readonly')
      const store = transaction.objectStore(type)
      const request = store.getAll()

      request.onsuccess = () => {
        const data = request.result as LookupData[]
        
        if (data.length === 0) {
          resolve(null)
          return
        }

        // Check if data is expired (using first item's timestamp as reference)
        // For simplicity, we'll check if any data exists and assume it's fresh
        // In a more sophisticated implementation, you'd store expiration per item
        resolve(data)
      }

      request.onerror = () => {
        console.error(`Failed to retrieve ${type} data:`, request.error)
        reject(request.error)
      }
    })
  }

  // Check if lookup data exists and is fresh
  async hasFreshLookupData(type: string, maxAgeMinutes: number = 60): Promise<boolean> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readonly')
      const store = transaction.objectStore(type)
      const countRequest = store.count()

      countRequest.onsuccess = () => {
        const count = countRequest.result
        resolve(count > 0) // Simple check - if data exists, assume it's fresh
      }

      countRequest.onerror = () => {
        console.error(`Failed to check ${type} data:`, countRequest.error)
        reject(countRequest.error)
      }
    })
  }

  // Clear specific lookup data
  async clearLookupData(type: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readwrite')
      const store = transaction.objectStore(type)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to clear ${type} data:`, request.error)
        reject(request.error)
      }
    })
  }

  // Clear all cached data
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const objectStoreNames = Array.from(this.db!.objectStoreNames)
    const clearPromises = objectStoreNames.map(name => this.clearLookupData(name))
    
    await Promise.all(clearPromises)
  }

  // Store any data with key-value pair and TTL
  async storeCacheData(
    key: string, 
    data: any, 
    ttlMinutes: number = 60
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      
      const expiresAt = Date.now() + (ttlMinutes * 60 * 1000)
      const cacheItem = {
        key,
        data,
        lastUpdated: Date.now(),
        expiresAt
      }

      const request = store.put(cacheItem)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to store cache data for key ${key}:`, request.error)
        reject(request.error)
      }
    })
  }

  // Retrieve cached data
  async getCacheData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        
        if (!result) {
          resolve(null)
          return
        }

        // Check if data is expired
        if (Date.now() > result.expiresAt) {
          // Data is expired, remove it
          this.removeCacheData(key)
          resolve(null)
          return
        }

        resolve(result.data)
      }

      request.onerror = () => {
        console.error(`Failed to retrieve cache data for key ${key}:`, request.error)
        reject(request.error)
      }
    })
  }

  // Remove specific cached data
  async removeCacheData(key: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.delete(key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to remove cache data for key ${key}:`, request.error)
        reject(request.error)
      }
    })
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const index = store.index('expiresAt')
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        console.error('Failed to cleanup expired cache:', request.error)
        reject(request.error)
      }
    })
  }

  // Recreate database with current version
  async recreateDatabase(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }

    // Delete the existing database
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      deleteRequest.onsuccess = () => {
        // Reinitialize with new version
        this.init().then(resolve).catch(reject)
      }
      deleteRequest.onerror = () => {
        reject(deleteRequest.error)
      }
    })
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService()

// Initialize IndexedDB when the service is imported
if (typeof window !== 'undefined') {
  indexedDBService.init().catch(error => {
    console.error('Failed to initialize IndexedDB:', error)
  })
}
