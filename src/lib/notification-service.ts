import { supabase } from './supabase'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
}

export interface NotificationData {
  item_id?: string
  item_name?: string
  current_stock?: number
  minimum_stock?: number
  alert_type?: string
}

export class NotificationService {
  
  static async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabase.rpc('get_user_notifications', {
      p_user_id: userId,
      p_limit: limit
    })

    if (error) throw error
    return data || []
  }

  
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_user_id: userId
    })

    if (error) throw error
    return data
  }

  
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error) throw error
  }

  
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error) throw error
    return count || 0
  }

  
  static async getNotificationsByType(
    userId: string, 
    type: string, 
    limit: number = 20
  ): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error
  }

  
  static async getLowStockNotifications(userId: string): Promise<Notification[]> {
    return this.getNotificationsByType(userId, 'low_stock')
  }

  
  static async getOutOfStockNotifications(userId: string): Promise<Notification[]> {
    return this.getNotificationsByType(userId, 'out_of_stock')
  }

  
  static async getInventoryAlerts(userId: string): Promise<Notification[]> {
    return this.getNotificationsByType(userId, 'inventory_alert')
  }

  
  static formatNotificationMessage(notification: Notification): string {
    switch (notification.type) {
      case 'low_stock':
        return `⚠️ ${notification.message}`
      case 'out_of_stock':
        return `🚨 ${notification.message}`
      case 'inventory_alert':
        return `📦 ${notification.message}`
      default:
        return notification.message
    }
  }

  
  static getNotificationIcon(type: string): string {
    switch (type) {
      case 'low_stock':
        return '⚠️'
      case 'out_of_stock':
        return '🚨'
      case 'inventory_alert':
        return '📦'
      default:
        return '🔔'
    }
  }

  
  static isUrgent(notification: Notification): boolean {
    return notification.type === 'out_of_stock' || 
           (notification.data?.alert_type === 'out_of_stock')
  }

  
  static getPriority(notification: Notification): 'high' | 'medium' | 'low' {
    if (this.isUrgent(notification)) return 'high'
    if (notification.type === 'low_stock') return 'medium'
    return 'low'
  }
}
