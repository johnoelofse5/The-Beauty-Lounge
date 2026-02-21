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
  Moon,
  Ban
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { FaInstagram, FaFacebook } from 'react-icons/fa'

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
      title: "Blocked Dates",
      url: "/blocked-dates",
      icon: Ban,
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
    {
      title: "Back Office",
      url: "/back-office",
      icon: Settings,
      show: canViewAdminFeatures,
    }
  ]

  const filteredItems = navigationItems.filter(item => item.show)

  return (
    <Sidebar className="overflow-x-hidden">
      <SidebarHeader className="min-w-0">
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

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="min-w-0">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.url

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} onClick={handleNavigationClick} className="min-w-0 w-full">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate min-w-0">{item.title}</span>
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
            <SidebarMenu className="min-w-0">
              <SidebarMenuItem>
                <Link href="/profile" onClick={handleNavigationClick}>
                  <SidebarMenuButton className="min-w-0 w-full">
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
                  className="sidebar-theme-toggle min-w-0 w-full"
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
                }} className="min-w-0 w-full">
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2 min-w-0 w-full">
                  <a
                    href="https://www.instagram.com/the.beautyloungebystacey?utm_source=qr&igsh=YjB5Z2ViYnRmZHFu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors min-w-0 flex-1"
                    onClick={handleNavigationClick}
                  >
                    <FaInstagram className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs truncate">Instagram</span>
                  </a>
                  <a
                    href="https://www.facebook.com/share/16fzv8TqFc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors min-w-0 flex-1"
                    onClick={handleNavigationClick}
                  >
                    <FaFacebook className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs truncate">Facebook</span>
                  </a>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2">
          <div className="text-xs text-sidebar-foreground/70 text-center">
            © 2025 The Beauty Lounge
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
