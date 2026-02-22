import { useState, useEffect } from 'react'
import { InventoryService } from '@/lib/inventory-service'
import { InventorySummary, FinancialSummary, LowStockItem } from '@/types/inventory'

export function useDashboard(enabled: boolean) {
  const [loading, setLoading] = useState(true)
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])

  const load = async () => {
    try {
      setLoading(true)
      const [inventory, financial, lowStock] = await Promise.all([
        InventoryService.getInventorySummary(),
        InventoryService.getFinancialSummary(),
        InventoryService.getLowStockItems()
      ])
      setInventorySummary(inventory)
      setFinancialSummary(financial)
      setLowStockItems(lowStock)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (enabled) load()
  }, [enabled])

  return { loading, inventorySummary, financialSummary, lowStockItems }
}