import { supabase } from './supabase'
import {
  InventoryCategory,
  InventoryItem,
  StockMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  FinancialTransaction,
  InventorySummary,
  FinancialSummary,
  LowStockItem,
  InventoryItemForm,
  StockAdjustmentForm,
  PurchaseOrderForm,
  FinancialTransactionForm,
  InventoryFilters,
  FinancialFilters,
  PurchaseOrderFilters,
  ServiceInventoryRelationship,
  ServiceInventoryRelationshipForm,
  ServiceWithInventory
} from '@/types/inventory'

export class InventoryService {
  
  static async getCategories(): Promise<InventoryCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order')

    if (error) throw error
    return data || []
  }

  static async createCategory(category: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryCategory> {
    const { data, error } = await supabase
      .from('service_categories')
      .insert([category])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateCategory(id: string, updates: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const { data, error } = await supabase
      .from('service_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('service_categories')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error
  }

  
  static async getItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        category:service_categories(*)
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.low_stock_only) {
      query = query.filter('current_stock', 'lte', 'minimum_stock')
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
    }

    const sortColumn = filters?.sort_by || 'name'
    const sortOrder = filters?.sort_order || 'asc'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  static async getItem(id: string): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        category:service_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async createItem(item: InventoryItemForm): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select(`
        *,
        category:service_categories(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async updateItem(id: string, updates: Partial<InventoryItemForm>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:service_categories(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error
  }

  
  static async getStockMovements(itemId?: string, limit = 50): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        item:inventory_items(name, sku)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  static async adjustStock(adjustment: StockAdjustmentForm & { created_by: string }): Promise<void> {
    const { item_id, adjustment_type, quantity, reason, notes, created_by } = adjustment

    
    const item = await this.getItem(item_id)
    
    
    const quantityChange = adjustment_type === 'increase' ? quantity : -quantity
    const newStock = item.current_stock + quantityChange

    if (newStock < 0) {
      throw new Error('Cannot reduce stock below zero')
    }

    
    const { error: transactionError } = await supabase.rpc('begin')
    if (transactionError) throw transactionError

    try {
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', item_id)

      if (updateError) throw updateError

      
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id,
          movement_type: 'adjustment',
          quantity: quantityChange,
          notes: `${reason}${notes ? ` - ${notes}` : ''}`,
          created_by
        }])

      if (movementError) throw movementError

      
      const { error: commitError } = await supabase.rpc('commit')
      if (commitError) throw commitError

    } catch (error) {
      
      await supabase.rpc('rollback')
      throw error
    }
  }

  
  static async getPurchaseOrders(filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(
          *,
          item:inventory_items(name, sku)
        )
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.supplier) {
      query = query.ilike('supplier_name', `%${filters.supplier}%`)
    }

    if (filters?.date_from) {
      query = query.gte('order_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('order_date', filters.date_to)
    }

    if (filters?.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%`)
    }

    const sortColumn = filters?.sort_by || 'order_date'
    const sortOrder = filters?.sort_order || 'desc'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  static async createPurchaseOrder(order: PurchaseOrderForm & { created_by: string }): Promise<PurchaseOrder> {
    const { items, created_by, ...orderData } = order

    
    const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0)
    const total_amount = subtotal 

    const { data: purchaseOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert([{
        ...orderData,
        order_number: orderNumber,
        subtotal,
        total_amount,
        created_by
      }])
      .select()
      .single()

    if (orderError) throw orderError

    
    const orderItems = items.map(item => ({
      ...item,
      purchase_order_id: purchaseOrder.id,
      total_cost: item.quantity_ordered * item.unit_cost
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    return await this.getPurchaseOrder(purchaseOrder.id)
  }

  static async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(
          *,
          item:inventory_items(name, sku)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async receivePurchaseOrder(id: string, receivedItems: { item_id: string; quantity_received: number }[], created_by: string): Promise<void> {
    
    const { error: transactionError } = await supabase.rpc('begin')
    if (transactionError) throw transactionError

    try {
      
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)

      if (orderError) throw orderError

      
      for (const receivedItem of receivedItems) {
        
        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .update({ quantity_received: receivedItem.quantity_received })
          .eq('purchase_order_id', id)
          .eq('item_id', receivedItem.item_id)

        if (itemError) throw itemError

        
        const { error: stockError } = await supabase.rpc('increment_stock', {
          item_id: receivedItem.item_id,
          quantity: receivedItem.quantity_received
        })

        if (stockError) throw stockError

        
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            item_id: receivedItem.item_id,
            movement_type: 'purchase',
            quantity: receivedItem.quantity_received,
            reference_id: id,
            reference_type: 'purchase_order',
            notes: 'Stock received from purchase order',
            created_by
          }])

        if (movementError) throw movementError
      }

      
      const { error: commitError } = await supabase.rpc('commit')
      if (commitError) throw commitError

    } catch (error) {
      
      await supabase.rpc('rollback')
      throw error
    }
  }

  
  static async getFinancialTransactions(filters?: FinancialFilters): Promise<FinancialTransaction[]> {
    let query = supabase
      .from('financial_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (filters?.transaction_type) {
      query = query.eq('transaction_type', filters.transaction_type)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.date_from) {
      query = query.gte('transaction_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('transaction_date', filters.date_to)
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,receipt_number.ilike.%${filters.search}%`)
    }

    const sortColumn = filters?.sort_by || 'transaction_date'
    const sortOrder = filters?.sort_order || 'desc'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  static async createFinancialTransaction(transaction: FinancialTransactionForm, createdBy: string): Promise<FinancialTransaction> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([{ ...transaction, created_by: createdBy }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  
  static async getInventorySummary(): Promise<InventorySummary> {
    const [itemsResult, categoriesResult, lowStockResult] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('current_stock, unit_cost')
        .eq('is_active', true)
        .eq('is_deleted', false),
      
      supabase
        .from('service_categories')
        .select('id')
        .eq('is_active', true)
        .eq('is_deleted', false),
      
      supabase.rpc('get_low_stock_items')
    ])

    if (itemsResult.error) throw itemsResult.error
    if (categoriesResult.error) throw categoriesResult.error
    if (lowStockResult.error) throw lowStockResult.error

    const items = itemsResult.data || []
    const totalValue = items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)

    return {
      total_items: items.length,
      total_value: totalValue,
      low_stock_items: (lowStockResult.data || []).length,
      categories_count: (categoriesResult.data || []).length
    }
  }

  static async getFinancialSummary(): Promise<FinancialSummary> {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    const currentYear = new Date().getFullYear()

    const [monthlyData, yearlyData] = await Promise.all([
      Promise.all([
        supabase.rpc('get_monthly_revenue', { month_date: currentMonth }),
        supabase.rpc('get_monthly_expenses', { month_date: currentMonth })
      ]),
      
      Promise.all([
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('transaction_type', 'income')
          .gte('transaction_date', `${currentYear}-01-01`)
          .eq('is_active', true)
          .eq('is_deleted', false),
        
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('transaction_type', 'expense')
          .gte('transaction_date', `${currentYear}-01-01`)
          .eq('is_active', true)
          .eq('is_deleted', false)
      ])
    ])

    const monthlyRevenue = monthlyData[0].data || 0
    const monthlyExpenses = monthlyData[1].data || 0

    const yearlyRevenue = (yearlyData[0].data || []).reduce((sum: number, t: any) => sum + t.amount, 0)
    const yearlyExpenses = (yearlyData[1].data || []).reduce((sum: number, t: any) => sum + t.amount, 0)

    return {
      total_income: yearlyRevenue,
      total_expenses: yearlyExpenses,
      net_profit: yearlyRevenue - yearlyExpenses,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      monthly_profit: monthlyRevenue - monthlyExpenses,
      yearly_revenue: yearlyRevenue,
      yearly_expenses: yearlyExpenses,
      yearly_profit: yearlyRevenue - yearlyExpenses
    }
  }

  static async getLowStockItems(): Promise<LowStockItem[]> {
    const { data, error } = await supabase.rpc('get_low_stock_items')

    if (error) throw error
    return data || []
  }

  
  static async getServiceInventoryRelationships(): Promise<ServiceInventoryRelationship[]> {
    const { data, error } = await supabase
      .from('service_inventory_relationships')
      .select(`
        *,
        service:services(*),
        inventory_item:inventory_items(*)
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async createServiceInventoryRelationship(
    relationshipData: ServiceInventoryRelationshipForm,
    userId: string
  ): Promise<ServiceInventoryRelationship> {
    const { data, error } = await supabase
      .from('service_inventory_relationships')
      .insert({
        ...relationshipData,
        created_by: userId,
        updated_by: userId
      })
      .select(`
        *,
        service:services(*),
        inventory_item:inventory_items(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async updateServiceInventoryRelationship(
    id: string,
    relationshipData: Partial<ServiceInventoryRelationshipForm>,
    userId: string
  ): Promise<ServiceInventoryRelationship> {
    const { data, error } = await supabase
      .from('service_inventory_relationships')
      .update({
        ...relationshipData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        service:services(*),
        inventory_item:inventory_items(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async deleteServiceInventoryRelationship(id: string): Promise<void> {
    const { error } = await supabase
      .from('service_inventory_relationships')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
  }

  static async getServicesWithInventory(): Promise<ServiceWithInventory[]> {
    const { data, error } = await supabase
      .from('service_inventory_relationships')
      .select(`
        service:services(*),
        inventory_item:inventory_items(*),
        quantity_used
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error) throw error

    
    const serviceMap = new Map<string, ServiceWithInventory>()
    
    data?.forEach((item: any) => {
      const serviceId = item.service.id
      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          service: item.service,
          inventory_items: []
        })
      }
      
      serviceMap.get(serviceId)!.inventory_items.push({
        inventory_item: item.inventory_item,
        quantity_used: item.quantity_used
      })
    })

    return Array.from(serviceMap.values())
  }

  
  static async checkServiceInventoryAvailability(serviceId: string): Promise<{
    canBook: boolean
    insufficientItems: string[]
  }> {
    const { data, error } = await supabase.rpc('check_service_inventory_availability', {
      p_service_id: serviceId
    })

    if (error) throw error
    return data?.[0] || { canBook: true, insufficientItems: [] }
  }

  
  static async getServiceInventoryRequirements(serviceId: string): Promise<Array<{
    inventory_item_id: string
    item_name: string
    quantity_required: number
    current_stock: number
    unit_of_measure: string
    is_available: boolean
  }>> {
    const { data, error } = await supabase.rpc('get_service_inventory_requirements', {
      p_service_id: serviceId
    })

    if (error) throw error
    return data || []
  }

  
  static async processServiceInventoryConsumption(
    serviceId: string,
    appointmentId: string,
    userId?: string
  ): Promise<Array<{
    inventory_item_id: string
    item_name: string
    quantity_consumed: number
    remaining_stock: number
    is_low_stock: boolean
  }>> {
    const { data, error } = await supabase.rpc('process_service_inventory_consumption', {
      p_service_id: serviceId,
      p_appointment_id: appointmentId,
      p_created_by: userId
    })

    if (error) throw error
    return data || []
  }

  
  static async updateFinancialTransaction(
    transactionId: string,
    data: FinancialTransactionForm,
    userId: string
  ): Promise<FinancialTransaction> {
    const { data: result, error } = await supabase
      .from('financial_transactions')
      .update({
        transaction_type: data.transaction_type,
        category: data.category,
        amount: data.amount,
        transaction_date: data.transaction_date,
        payment_method: data.payment_method,
        receipt_number: data.receipt_number,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) throw error
    return result
  }
}
