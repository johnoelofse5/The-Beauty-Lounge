import { supabase } from '@/lib/supabase'
import { LookupType, Lookup, LookupWithType } from '@/types/lookup'
import { LOOKUP_TYPE_CODES, LookupTypeCode } from '@/constants/lookup-codes'

export class LookupService {
  /**
   * Get all active lookup types
   */
  static async getLookupTypes(): Promise<LookupType[]> {
    const { data, error } = await supabase
      .from('lookup_type')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching lookup types:', error)
      throw new Error('Failed to fetch lookup types')
    }

    return data || []
  }

  /**
   * Get lookup type by code
   */
  static async getLookupTypeByCode(code: string): Promise<LookupType | null> {
    const { data, error } = await supabase
      .from('lookup_type')
      .select('*')
      .eq('lookup_type_code', code)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No lookup type found
      }
      console.error('Error fetching lookup type by code:', error)
      throw new Error('Failed to fetch lookup type')
    }

    return data
  }

  /**
   * Get all lookups for a specific lookup type
   */
  static async getLookupsByType(lookupTypeId: string): Promise<Lookup[]> {
    const { data, error } = await supabase
      .from('lookup')
      .select('*')
      .eq('lookup_type_id', lookupTypeId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching lookups by type:', error)
      throw new Error('Failed to fetch lookups')
    }

    return data || []
  }

  /**
   * Get lookups by lookup type code
   */
  static async getLookupsByTypeCode(typeCode: LookupTypeCode): Promise<Lookup[]> {
    // First get the lookup type ID
    const { data: lookupType, error: typeError } = await supabase
      .from('lookup_type')
      .select('id')
      .eq('lookup_type_code', typeCode)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (typeError) {
      console.error('Error fetching lookup type:', typeError)
      throw new Error('Failed to fetch lookup type')
    }

    if (!lookupType) {
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

    return data || []
  }

  /**
   * Get a specific lookup by type code and value
   */
  static async getLookupByTypeCodeAndValue(typeCode: LookupTypeCode, value: string): Promise<Lookup | null> {
    // First get the lookup type ID
    const { data: lookupType, error: typeError } = await supabase
      .from('lookup_type')
      .select('id')
      .eq('lookup_type_code', typeCode)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (typeError) {
      console.error('Error fetching lookup type:', typeError)
      throw new Error('Failed to fetch lookup type')
    }

    if (!lookupType) {
      return null
    }

    // Then get the specific lookup
    const { data, error } = await supabase
      .from('lookup')
      .select('*')
      .eq('lookup_type_id', lookupType.id)
      .eq('value', value)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No lookup found
      }
      console.error('Error fetching lookup by type code and value:', error)
      throw new Error('Failed to fetch lookup')
    }

    return data
  }

  /**
   * Get hours (00-24)
   */
  static async getHours(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.HOURS)
  }

  /**
   * Get days of the week
   */
  static async getDaysOfWeek(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.DAYS_OF_WEEK)
  }

  /**
   * Get time slot intervals
   */
  static async getTimeSlotIntervals(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.TIME_SLOT_INTERVALS)
  }

  /**
   * Get service categories
   */
  static async getServiceCategories(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.SERVICE_CATEGORIES)
  }

  /**
   * Get appointment statuses
   */
  static async getAppointmentStatuses(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.APPOINTMENT_STATUS)
  }

  /**
   * Get payment methods
   */
  static async getPaymentMethods(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.PAYMENT_METHODS)
  }

  /**
   * Get payment statuses
   */
  static async getPaymentStatuses(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.PAYMENT_STATUS)
  }

  /**
   * Get yes/no options
   */
  static async getYesNoOptions(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.YES_NO)
  }

  /**
   * Get priority levels
   */
  static async getPriorityLevels(): Promise<Lookup[]> {
    return this.getLookupsByTypeCode(LOOKUP_TYPE_CODES.PRIORITY_LEVELS)
  }

  /**
   * Get all lookups with their types
   */
  static async getAllLookupsWithTypes(): Promise<LookupWithType[]> {
    const { data, error } = await supabase
      .from('lookup')
      .select(`
        *,
        lookup_type:lookup_type_id(*)
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('lookup_type.name', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching all lookups with types:', error)
      throw new Error('Failed to fetch lookups')
    }

    return data || []
  }

  /**
   * Create a new lookup type
   */
  static async createLookupType(lookupType: Omit<LookupType, 'id' | 'created_at' | 'updated_at'>): Promise<LookupType> {
    const { data, error } = await supabase
      .from('lookup_type')
      .insert([lookupType])
      .select()
      .single()

    if (error) {
      console.error('Error creating lookup type:', error)
      throw new Error('Failed to create lookup type')
    }

    return data
  }

  /**
   * Create a new lookup
   */
  static async createLookup(lookup: Omit<Lookup, 'id' | 'created_at' | 'updated_at'>): Promise<Lookup> {
    const { data, error } = await supabase
      .from('lookup')
      .insert([lookup])
      .select()
      .single()

    if (error) {
      console.error('Error creating lookup:', error)
      throw new Error('Failed to create lookup')
    }

    return data
  }

  /**
   * Update a lookup type
   */
  static async updateLookupType(id: string, updates: Partial<LookupType>): Promise<LookupType> {
    const { data, error } = await supabase
      .from('lookup_type')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lookup type:', error)
      throw new Error('Failed to update lookup type')
    }

    return data
  }

  /**
   * Update a lookup
   */
  static async updateLookup(id: string, updates: Partial<Lookup>): Promise<Lookup> {
    const { data, error } = await supabase
      .from('lookup')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lookup:', error)
      throw new Error('Failed to update lookup')
    }

    return data
  }

  /**
   * Soft delete a lookup type
   */
  static async deleteLookupType(id: string): Promise<void> {
    const { error } = await supabase
      .from('lookup_type')
      .update({ is_deleted: true, is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting lookup type:', error)
      throw new Error('Failed to delete lookup type')
    }
  }

  /**
   * Soft delete a lookup
   */
  static async deleteLookup(id: string): Promise<void> {
    const { error } = await supabase
      .from('lookup')
      .update({ is_deleted: true, is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting lookup:', error)
      throw new Error('Failed to delete lookup')
    }
  }
}
