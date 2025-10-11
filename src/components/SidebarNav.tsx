'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { canViewAllAppointments, canViewAdmin, canManageServices, canManageUsers, isPractitioner, isSuperAdmin, canManagePortfolio, canViewPortfolio, canManageSchedule } from '@/lib/rbac'  
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Home,
  Calendar,
  Users,
  Settings,
  Mail,
  User,
  LogOut,
  Sparkles,
  PlusCircle,
  Image,
  Clock,
  Package,
  TrendingUp,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface SidebarNavProps {
  title?: string
}

export default function SidebarNav({ title = "The Beauty Lounge" }: SidebarNavProps) {
  const { user, userRoleData, signOut } = useAuth()
  const { showSuccess, showError } = useToast()
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()
  const { theme, toggleTheme, effectiveTheme } = useTheme()
  const [permissions, setPermissions] = useState({
    canManagePortfolio: false,
    canViewPortfolio: false,
    canManageSchedule: false
  })

  
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id) return

      try {
        const [portfolioManage, portfolioView, scheduleManage] = await Promise.all([
          canManagePortfolio(user.id),
          canViewPortfolio(user.id),
          canManageSchedule(user.id)
        ])

        setPermissions({
          canManagePortfolio: portfolioManage,
          canViewPortfolio: portfolioView,
          canManageSchedule: scheduleManage
        })
      } catch (error) {
        console.error('Error loading permissions:', error)
      }
    }

    loadPermissions()
  }, [user?.id])

  const handleSignOut = async () => {
    try {
      await signOut()
      showSuccess('Successfully signed out')
    } catch (error) {
      console.error('Error signing out:', error)
      
      
      showError('Session expired. Please sign in again.')
    }
  }

  const handleNavigationClick = () => {
    
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  if (!user) {
    return null
  }

  const canViewAdminFeatures = canViewAdmin(userRoleData?.role || null)
  const canViewAllAppts = canViewAllAppointments(userRoleData?.role || null)
  const canManageServicesAccess = canManageServices(userRoleData?.role || null)
  const canManageUsersAccess = canManageUsers(userRoleData?.role || null)
  const isPractitionerUser = isPractitioner(userRoleData?.role || null)

  const navigationItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
      show: true,
    },
    {
      title: "My Appointments",
      url: "/appointments-management",
      icon: Calendar,
      show: !canViewAllAppts, 
    },
    {
      title: "All Appointments",
      url: "/appointments-management",
      icon: Calendar,
      show: canViewAllAppts, 
    },
    {
      title: "Book for Client",
      url: "/appointments",
      icon: PlusCircle,
      show: isPractitionerUser || canViewAdminFeatures, 
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: Image,
      show: permissions.canViewPortfolio, 
    },
    {
      title: "Manage Portfolio",
      url: "/portfolio/manage",
      icon: Image,
      show: permissions.canManagePortfolio, 
    },
    {
      title: "Working Schedule",
      url: "/schedule",
      icon: Clock,
      show: permissions.canManageSchedule, 
    },
    {
      title: "Inventory & Finance",
      url: "/inventory-finance",
      icon: TrendingUp,
      show: canViewAdminFeatures || isPractitionerUser, 
    },
    {
      title: "Services",
      url: "/services",
      icon: Sparkles,
      show: canManageServicesAccess, 
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      show: canManageUsersAccess, 
    },
    {
      title: "Roles & Permissions",
      url: "/roles",
      icon: Settings,
      show: canViewAdminFeatures, 
    },
    {
      title: "Email Tracking",
      url: "/email-tracking",
      icon: Mail,
      show: canViewAdminFeatures, 
    },
  ]

  const filteredItems = navigationItems.filter(item => item.show)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2C7EB] text-gray-900 flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {title}
            </span>
            <span className="text-xs text-sidebar-foreground/70 truncate">
              {typeof userRoleData?.role === 'string' ? userRoleData.role : 'User'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.url
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} onClick={handleNavigationClick} className="min-w-0">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/profile" onClick={handleNavigationClick}>
                  <SidebarMenuButton>
                    <User className="h-4 w-4" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {typeof user.user_metadata?.first_name === 'string' 
                          ? user.user_metadata.first_name 
                          : typeof user.email === 'string' 
                          ? user.email 
                          : 'User'}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    toggleTheme()
                    handleNavigationClick()
                  }}
                  className="sidebar-theme-toggle"
                >
                  {effectiveTheme === 'dark' ? (
                    <Sun className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">
                    {effectiveTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {
                  handleSignOut()
                  handleNavigationClick()
                }}>
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2">
          <div className="text-xs text-sidebar-foreground/70 text-center">
            © 2024 The Beauty Lounge
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
