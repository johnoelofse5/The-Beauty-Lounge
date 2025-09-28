// Inventory and Financial Management Types
import { Service } from './service'

export interface InventoryCategory {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  category_id: string
  category?: InventoryCategory
  service_id?: string
  service?: Service
  name: string
  description?: string
  sku?: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  maximum_stock?: number
  unit_cost: number
  selling_price: number
  supplier_name?: string
  supplier_contact?: string
  notes?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  item_id: string
  item?: InventoryItem
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'waste'
  quantity: number
  unit_cost?: number
  total_cost?: number
  reference_id?: string
  reference_type?: string
  notes?: string
  created_at: string
}

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_name: string
  supplier_contact?: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  subtotal: number
  tax_amount: number
  shipping_cost: number
  total_amount: number
  notes?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  item_id: string
  item?: InventoryItem
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  created_at: string
}

export interface FinancialTransaction {
  id: string
  transaction_type: 'income' | 'expense'
  category: string
  amount: number
  transaction_date: string
  reference_id?: string
  reference_type?: string
  payment_method?: string
  receipt_number?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ServiceRevenue {
  id: string
  appointment_id: string
  service_id: string
  financial_transaction_id: string
  quantity: number
  unit_price: number
  total_amount: number
  created_at: string
}

// Dashboard summary types
export interface InventorySummary {
  total_items: number
  total_value: number
  low_stock_items: number
  categories_count: number
}

export interface FinancialSummary {
  total_income: number
  total_expenses: number
  net_profit: number
  monthly_revenue: number
  monthly_expenses: number
  monthly_profit: number
  yearly_revenue: number
  yearly_expenses: number
  yearly_profit: number
}

export interface LowStockItem {
  item_id: string
  item_name: string
  current_stock: number
  minimum_stock: number
}

// Form types
export interface InventoryItemForm {
  category_id: string
  service_id?: string
  name: string
  description?: string
  unit_of_measure: string
  current_stock: number
  maximum_stock?: number
  unit_cost: number
}

export interface StockAdjustmentForm {
  item_id: string
  adjustment_type: 'increase' | 'decrease'
  quantity: number
  reason: string
  notes?: string
}

export interface PurchaseOrderForm {
  supplier_name: string
  supplier_contact?: string
  order_date: string
  expected_delivery_date?: string
  notes?: string
  items: {
    item_id: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

export interface FinancialTransactionForm {
  transaction_type: 'income' | 'expense'
  category: string
  amount: number
  transaction_date: string
  payment_method?: string
  receipt_number?: string
}

// Filter and search types
export interface InventoryFilters {
  category_id?: string
  low_stock_only?: boolean
  search?: string
  sort_by?: 'name' | 'stock' | 'value' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface FinancialFilters {
  transaction_type?: 'income' | 'expense'
  category?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'date' | 'amount' | 'category'
  sort_order?: 'asc' | 'desc'
}

export interface PurchaseOrderFilters {
  status?: 'pending' | 'ordered' | 'received' | 'cancelled'
  supplier?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'order_date' | 'total_amount' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface ServiceInventoryRelationship {
  id: string
  service_id: string
  service?: Service
  inventory_item_id: string
  inventory_item?: InventoryItem
  quantity_used: number
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  updated_by?: string
}

export interface ServiceInventoryRelationshipForm {
  service_id: string
  inventory_item_id: string
  quantity_used: number
}

export interface ServiceWithInventory {
  service: Service
  inventory_items: Array<{
    inventory_item: InventoryItem
    quantity_used: number
  }>
}
