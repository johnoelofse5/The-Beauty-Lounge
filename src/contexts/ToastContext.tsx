'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastContainer } from '@/components/Toast'

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    }
    
    setToasts(prev => [...prev, newToast])
  }, [])

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title })
  }, [showToast])

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title })
  }, [showToast])

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title })
  }, [showToast])

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title })
  }, [showToast])

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
