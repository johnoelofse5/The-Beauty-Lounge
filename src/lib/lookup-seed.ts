'use client'

import { indexedDBService } from '@/lib/indexeddb-service'
import { getAllLookupTypeCodes, LookupTypeCode } from '@/constants/lookup-codes'
import { LookupService } from './lookup-service'

export async function seedLookups(force = false): Promise<void> {
  try {
    const lookupTypes = await LookupService.getLookupTypes()
    await indexedDBService.storeLookupTypes(lookupTypes)

    const codes = getAllLookupTypeCodes()

    await Promise.allSettled(
      codes.map(async (code: LookupTypeCode) => {
        try {
          if (!force) {
            const hasData = await indexedDBService.hasLookups(code)
            if (hasData) return
          }

          const lookups = await LookupService.getLookupsByTypeCode(code)
          await indexedDBService.storeLookups(code, lookups)
        } catch (err) {
          console.warn(`Failed to seed lookups for "${code}":`, err)
        }
      })
    )
  } catch (err) {
    console.error('Failed to seed lookups:', err)
  }
}

export async function refreshLookupType(code: LookupTypeCode): Promise<void> {
  const lookups = await LookupService.getLookupsByTypeCode(code)
  await indexedDBService.storeLookups(code, lookups)
}

export async function refreshAllLookups(): Promise<void> {
  return seedLookups(true)
}