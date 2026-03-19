import { UserWithRole } from '@/types';
import { supabase } from './supabase';

export interface UserRole {
  id: string;
  name: string;
  description: string;
}

export interface UserPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface UserWithRoleAndPermissions {
  user: UserWithRole;
  role: UserRole | null;
  permissions: UserPermission[];
}

export async function getUserRoleAndPermissions(
  userId: string
): Promise<UserWithRoleAndPermissions | null> {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    if (!userData) {
      console.warn('No user data found for userId:', userId);
      return null;
    }

    if (!userData.role_id) {
      console.warn('User has no role assigned:', userId);
      return { user: userData, role: null, permissions: [] };
    }

    const { data: permissionsData, error: permissionsError } = await supabase
      .from('role_permissions')
      .select(`permissions!inner(*)`)
      .eq('role_id', userData.role_id);

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
      throw permissionsError;
    }

    const permissions =
      permissionsData?.map((rp: { permissions: UserPermission[] }) => rp.permissions).flat() || [];

    return {
      user: userData,
      role: {
        id: userData.role_id,
        name: userData.role_name,
        description: userData.role_description,
      },
      permissions,
    };
  } catch (error) {
    console.error('Error getting user role and permissions:', error);
    return null;
  }
}

export function hasPermission(
  userPermissions: UserPermission[],
  resource: string,
  action: string
): boolean {
  return userPermissions.some((p) => p.resource === resource && p.action === action);
}

export function hasRole(userRole: UserRole | null, roleName: string): boolean {
  return userRole?.name === roleName;
}

export function isSuperAdmin(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'super_admin');
}

export function isPractitioner(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'practitioner');
}

export function isClient(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'client');
}

export function canViewAllAppointments(userRole: UserRole | null): boolean {
  return isSuperAdmin(userRole) || isPractitioner(userRole);
}

export function canViewAdmin(userRole: UserRole | null): boolean {
  return isSuperAdmin(userRole);
}

export function canManageServices(userRole: UserRole | null): boolean {
  return isSuperAdmin(userRole) || isPractitioner(userRole);
}

export function canManageUsers(userRole: UserRole | null): boolean {
  return isSuperAdmin(userRole) || isPractitioner(userRole);
}

export function canViewOwnAppointmentsOnly(userRole: UserRole | null): boolean {
  return isClient(userRole);
}

export async function getFilteredAppointments(userId: string, userRole: UserRole | null) {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (canViewOwnAppointmentsOnly(userRole)) {
      query = query.eq('user_id', userId);
    } else if (isPractitioner(userRole)) {
      query = query.eq('practitioner_id', userId);
    } else if (isSuperAdmin(userRole)) {
      // no filter — see all
    } else {
      query = query.or(`user_id.eq.${userId},practitioner_id.eq.${userId}`);
    }

    const { data: appointments, error } = await query.order('appointment_date', {
      ascending: true,
    });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (!appointments || appointments.length === 0) return [];

    const userIds = [
      ...new Set([
        ...appointments.map((apt) => apt.user_id).filter(Boolean),
        ...appointments.map((apt) => apt.practitioner_id).filter(Boolean),
      ]),
    ];

    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return appointments;
    }

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return appointments.map((appointment) => ({
      ...appointment,
      client: profilesMap.get(appointment.user_id) || null,
      practitioner: profilesMap.get(appointment.practitioner_id) || null,
    }));
  } catch (error) {
    console.error('Error fetching filtered appointments:', error);
    return [];
  }
}

async function checkUserPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('role_id')
      .eq('id', userId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();

    if (error || !data?.role_id) return false;

    const { data: perms, error: permsError } = await supabase
      .from('role_permissions')
      .select(`permissions!inner(name)`)
      .eq('role_id', data.role_id);

    if (permsError || !perms) return false;

    return perms.some((rp: any) => rp.permissions?.name === permissionName);
  } catch (error) {
    console.error(`Error checking permission ${permissionName}:`, error);
    return false;
  }
}

export async function canManagePortfolio(userId: string): Promise<boolean> {
  return checkUserPermission(userId, 'portfolio.manage');
}

export async function canViewPortfolio(userId: string): Promise<boolean> {
  return checkUserPermission(userId, 'portfolio.view');
}

export async function canManageSchedule(userId: string): Promise<boolean> {
  return checkUserPermission(userId, 'schedule.manage');
}

export async function canViewSchedule(userId: string): Promise<boolean> {
  return checkUserPermission(userId, 'schedule.view');
}
