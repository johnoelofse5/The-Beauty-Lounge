import { supabase } from './supabase'

export interface BookingProgress {
  id?: string
  user_id: string
  practitioner_id?: string
  current_step: number
  selected_services?: string[]
  selected_practitioner_id?: string
  selected_client_id?: string
  selected_date?: string
  selected_time?: string
  notes?: string
  is_external_client?: boolean
  external_client_info?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  created_at?: string
  updated_at?: string
  expires_at?: string
  is_active?: boolean
  is_deleted?: boolean
}

export class BookingProgressService {
  /**
   * Save booking progress for a user
   */
  static async saveProgress(userId: string, progress: Partial<BookingProgress>): Promise<BookingProgress | null> {
    try {
      
      const { data: existingProgressData, error: fetchError } = await supabase
        .from('booking_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (fetchError) {
        
        if (fetchError.code === '42P01' || fetchError.message.includes('relation') || fetchError.message.includes('does not exist')) {
          return null
        }
        throw fetchError
      }

      const existingProgress = existingProgressData && existingProgressData.length > 0 ? existingProgressData[0] : null

      const progressData = {
        user_id: userId,
        current_step: progress.current_step || 1,
        selected_services: progress.selected_services ? JSON.stringify(progress.selected_services) : null,
        selected_practitioner_id: progress.selected_practitioner_id || null,
        selected_client_id: progress.selected_client_id || null,
        selected_date: progress.selected_date || null,
        selected_time: progress.selected_time || null,
        notes: progress.notes || null,
        is_external_client: progress.is_external_client || false,
        external_client_info: progress.external_client_info ? JSON.stringify(progress.external_client_info) : null,
        practitioner_id: progress.practitioner_id || null,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
      }

      let result
      if (existingProgress) {
        
        const { data: updateData, error } = await supabase
          .from('booking_progress')
          .update(progressData)
          .eq('id', existingProgress.id)
          .select()

        if (error) {
          
          if (error.code === '42501') {
            throw new Error('Permission denied: Unable to update booking progress')
          }
          throw error
        }
        result = updateData && updateData.length > 0 ? updateData[0] : null
      } else {
        
        const { data: insertData, error } = await supabase
          .from('booking_progress')
          .insert([progressData])
          .select()

        if (error) {
          
          if (error.code === '42501') {
            throw new Error('Permission denied: Unable to save booking progress')
          }
          throw error
        }
        result = insertData && insertData.length > 0 ? insertData[0] : null
      }

      return this.parseProgress(result)
    } catch (error) {
      throw error
    }
  }

  /**
   * Load booking progress for a user
   */
  static async loadProgress(userId: string): Promise<BookingProgress | null> {
    try {
      const { data, error } = await supabase
        .from('booking_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        throw error
      }

      
      if (!data || data.length === 0) {
        return null
      }

      
      return this.parseProgress(data[0])
    } catch (error) {
      
      throw error
    }
  }

  /**
   * Clear booking progress for a user
   */
  static async clearProgress(userId: string): Promise<void> {
    try {
      
      const { data: existingProgress, error: checkError } = await supabase
        .from('booking_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_deleted', false)

      
      if (!existingProgress || existingProgress.length === 0) {
        return
      }

      
      const { error } = await supabase
        .from('booking_progress')
        .update({ 
          is_active: false, 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_deleted', false)
    } catch (error) {
      throw error
    }
  }

  /**
   * Parse database result to BookingProgress object
   */
  private static parseProgress(data: any): BookingProgress {
    return {
      id: data.id,
      user_id: data.user_id,
      practitioner_id: data.practitioner_id,
      current_step: data.current_step,
      selected_services: data.selected_services ? JSON.parse(data.selected_services) : undefined,
      selected_practitioner_id: data.selected_practitioner_id,
      selected_client_id: data.selected_client_id,
      selected_date: data.selected_date,
      selected_time: data.selected_time,
      notes: data.notes,
      is_external_client: data.is_external_client,
      external_client_info: data.external_client_info ? JSON.parse(data.external_client_info) : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      expires_at: data.expires_at,
      is_active: data.is_active,
      is_deleted: data.is_deleted
    }
  }

  /**
   * Clean up expired booking progress (can be run as a cron job)
   */
  static async cleanupExpiredProgress(): Promise<void> {
    try {
      const { error } = await supabase
        .from('booking_progress')
        .update({ 
          is_active: false, 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (error) throw error
    } catch (error) {
      console.error('Error cleaning up expired progress:', error)
      throw error
    }
  }
}
