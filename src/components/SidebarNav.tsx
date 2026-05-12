'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  canViewAllAppointments,
  canViewAdmin,
  canManageServices,
  canManageUsers,
  isPractitioner,
  canManagePortfolio,
  canViewPortfolio,
  canManageSchedule,
} from '@/lib/rbac';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import {
  Ban,
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  Home,
  Image,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  PlusCircle,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { FaInstagram, FaFacebook } from 'react-icons/fa';
import { NavGroup } from '@/types/nav-group';

interface SidebarNavProps {
  title?: string;
}

const GROUP_CHILD_URLS: Record<string, string[]> = {
  Appointments: ['/appointments-management', '/appointments'],
  Portfolio: ['/portfolio', '/portfolio/manage'],
  Schedule: ['/schedule', '/blocked-dates'],
  Business: ['/analytics', '/inventory-finance'],
  Administration: ['/services', '/users', '/roles', '/tracking', '/back-office', '/send-sms'],
};

export default function SidebarNav({ title = 'The Beauty Lounge' }: SidebarNavProps) {
  const { user, userRoleData, signOut } = useAuth();
  const { showSuccess, showError } = useToast();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { toggleTheme, effectiveTheme } = useTheme();

  const [permissions, setPermissions] = useState({
    canManagePortfolio: false,
    canViewPortfolio: false,
    canManageSchedule: false,
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const [group, urls] of Object.entries(GROUP_CHILD_URLS)) {
      initial[group] = urls.includes(pathname);
    }
    return initial;
  });

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id) return;
      try {
        const [portfolioManage, portfolioView, scheduleManage] = await Promise.all([
          canManagePortfolio(user.id),
          canViewPortfolio(user.id),
          canManageSchedule(user.id),
        ]);
        setPermissions({
          canManagePortfolio: portfolioManage,
          canViewPortfolio: portfolioView,
          canManageSchedule: scheduleManage,
        });
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };
    loadPermissions();
  }, [user?.id]);

  useEffect(() => {
    for (const [group, urls] of Object.entries(GROUP_CHILD_URLS)) {
      if (urls.includes(pathname)) {
        setOpenGroups((prev) => ({ ...prev, [group]: true }));
        break;
      }
    }
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      showSuccess('Successfully signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      showError('Session expired. Please sign in again.');
    }
  };

  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  if (!user) {
    return null;
  }

  const canViewAdminFeatures = canViewAdmin(userRoleData?.role || null);
  const canViewAllAppts = canViewAllAppointments(userRoleData?.role || null);
  const canManageServicesAccess = canManageServices(userRoleData?.role || null);
  const canManageUsersAccess = canManageUsers(userRoleData?.role || null);
  const isPractitionerUser = isPractitioner(userRoleData?.role || null);

  const navGroups: NavGroup[] = [
    {
      title: 'Home',
      url: '/',
      icon: Home,
      show: true,
    },
    {
      title: 'Appointments',
      icon: Calendar,
      show: true,
      children: [
        {
          title: canViewAllAppts ? 'All Appointments' : 'My Appointments',
          url: '/appointments-management',
          icon: Calendar,
          show: true,
        },
        {
          title: 'Book for Client',
          url: '/appointments',
          icon: PlusCircle,
          show: isPractitionerUser || canViewAdminFeatures,
        },
      ],
    },
    {
      title: 'Portfolio',
      icon: Image,
      show: permissions.canViewPortfolio || permissions.canManagePortfolio,
      children: [
        {
          title: 'View Portfolio',
          url: '/portfolio',
          icon: Image,
          show: permissions.canViewPortfolio,
        },
        {
          title: 'Manage Portfolio',
          url: '/portfolio/manage',
          icon: Image,
          show: permissions.canManagePortfolio,
        },
      ],
    },
    {
      title: 'Schedule',
      icon: Clock,
      show: permissions.canManageSchedule,
      children: [
        {
          title: 'Working Schedule',
          url: '/schedule',
          icon: Clock,
          show: true,
        },
        {
          title: 'Blocked Dates',
          url: '/blocked-dates',
          icon: Ban,
          show: true,
        },
      ],
    },
    {
      title: 'Business',
      icon: TrendingUp,
      show: canViewAdminFeatures || isPractitionerUser,
      children: [
        {
          title: 'Analytics',
          url: '/analytics',
          icon: BarChart2,
          show: canViewAdminFeatures || isPractitionerUser,
        },
        {
          title: 'Inventory & Finance',
          url: '/inventory-finance',
          icon: TrendingUp,
          show: canViewAdminFeatures || isPractitionerUser,
        },
      ],
    },
    {
      title: 'Administration',
      icon: Settings,
      show: canViewAdminFeatures,
      children: [
        {
          title: 'Services',
          url: '/services',
          icon: Sparkles,
          show: canManageServicesAccess,
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
          show: canManageUsersAccess,
        },
        {
          title: 'Roles & Permissions',
          url: '/roles',
          icon: Settings,
          show: canViewAdminFeatures,
        },
        {
          title: 'Logs',
          url: '/tracking',
          icon: Mail,
          show: canViewAdminFeatures,
        },
        {
          title: 'Back Office',
          url: '/back-office',
          icon: Settings,
          show: canViewAdminFeatures,
        },
        {
          title: 'Send SMS',
          url: '/send-sms',
          icon: MessageSquare,
          show: canViewAdminFeatures,
        },
      ],
    },
  ];

  const visibleGroups = navGroups.filter((g) => g.show);

  return (
    <Sidebar className="overflow-x-hidden">
      <SidebarHeader className="min-w-0">
        <div className="flex items-center gap-2 px-2 py-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2C7EB] text-gray-900 flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">{title}</span>
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
              {visibleGroups.map((group) => {
                const Icon = group.icon;

                if (!group.children) {
                  const isActive = pathname === group.url;
                  return (
                    <SidebarMenuItem key={group.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={group.url!}
                          onClick={handleNavigationClick}
                          className="min-w-0 w-full"
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate min-w-0">{group.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const visibleChildren = group.children.filter((c) => c.show);
                if (visibleChildren.length === 0) return null;

                if (visibleChildren.length === 1) {
                  const child = visibleChildren[0];
                  const ChildIcon = child.icon;
                  const isActive = pathname === child.url;
                  return (
                    <SidebarMenuItem key={group.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={child.url}
                          onClick={handleNavigationClick}
                          className="min-w-0 w-full"
                        >
                          <ChildIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate min-w-0">{child.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isGroupActive = visibleChildren.some((c) => c.url === pathname);
                const isOpen = openGroups[group.title] ?? false;

                return (
                  <CollapsiblePrimitive.Root
                    key={group.title}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsiblePrimitive.Trigger asChild>
                        <SidebarMenuButton isActive={isGroupActive} className="min-w-0 w-full">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate min-w-0 flex-1">{group.title}</span>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsiblePrimitive.Trigger>
                      <CollapsiblePrimitive.Content>
                        <SidebarMenuSub>
                          {visibleChildren.map((child) => {
                            const ChildIcon = child.icon;
                            const isActive = pathname === child.url;
                            return (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={child.url} onClick={handleNavigationClick}>
                                    <ChildIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsiblePrimitive.Content>
                    </SidebarMenuItem>
                  </CollapsiblePrimitive.Root>
                );
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
                    toggleTheme();
                    handleNavigationClick();
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
                <SidebarMenuButton
                  onClick={() => {
                    handleSignOut();
                    handleNavigationClick();
                  }}
                  className="min-w-0 w-full"
                >
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
  );
}
