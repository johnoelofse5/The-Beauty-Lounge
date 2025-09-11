'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { canViewAllAppointments } from '@/lib/rbac'
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
} from '@/components/ui/sidebar'
import {
  Home,
  Calendar,
  Users,
  Settings,
  Mail,
  User,
  LogOut,
  Menu,
  Sparkles,
} from 'lucide-react'

interface SidebarNavProps {
  title?: string
}

export default function SidebarNav({ title = "The Beauty Lounge" }: SidebarNavProps) {
  const { user, userRoleData, signOut } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) {
    return null
  }

  const canViewAdmin = canViewAllAppointments(userRoleData?.role || null)

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
      show: !canViewAdmin, // Show for non-admin users (clients and practitioners)
    },
    {
      title: "All Appointments",
      url: "/appointments-management",
      icon: Calendar,
      show: canViewAdmin, // Show only for admin users (super_admin)
    },
    {
      title: "Services",
      url: "/services",
      icon: Sparkles,
      show: canViewAdmin,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      show: canViewAdmin,
    },
    {
      title: "Roles & Permissions",
      url: "/roles",
      icon: Settings,
      show: canViewAdmin,
    },
    {
      title: "Email Tracking",
      url: "/email-tracking",
      icon: Mail,
      show: canViewAdmin,
    },
  ]

  const filteredItems = navigationItems.filter(item => item.show)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2C7EB] text-gray-900">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {title}
            </span>
            <span className="text-xs text-sidebar-foreground/70">
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
                      <Link href={item.url}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
                <SidebarMenuButton>
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {typeof user.user_metadata?.first_name === 'string' 
                        ? user.user_metadata.first_name 
                        : typeof user.email === 'string' 
                        ? user.email 
                        : 'User'}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">
                      {typeof user.email === 'string' ? user.email : 'No email'}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
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
