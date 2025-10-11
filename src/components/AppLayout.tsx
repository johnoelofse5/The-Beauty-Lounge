'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import SidebarNav from '@/components/SidebarNav'
import AppointmentCompletionNotification from '@/components/AppointmentCompletionNotification'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  
  const authPages = ['/login', '/signup']
  const shouldShowSidebar = user && !authPages.includes(pathname)

  if (!shouldShowSidebar) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-white dark:bg-gray-900 px-4">
          <SidebarTrigger className="-ml-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 shadow-sm" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">The Beauty Lounge</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
        {/* Appointment completion notifications */}
        <AppointmentCompletionNotification />
      </SidebarInset>
    </SidebarProvider>
  )
}
