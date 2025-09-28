'use client'

import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { NotificationService } from '@/lib/notification-service'
import NotificationCenter from './NotificationCenter'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnreadCount()
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount(userId)
      setUnreadCount(count)
    } catch (err) {
      console.error('Error loading unread count:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBellClick = () => {
    setShowNotificationCenter(true)
  }

  const handleCloseNotificationCenter = () => {
    setShowNotificationCenter(false)
    // Refresh unread count when closing
    loadUnreadCount()
  }

  return (
    <>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {loading && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      {showNotificationCenter && (
        <NotificationCenter
          userId={userId}
          onClose={handleCloseNotificationCenter}
        />
      )}
    </>
  )
}
