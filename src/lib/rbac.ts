import { supabase } from './supabase'
import { Role, Permission, UserWithRole } from '@/types'

export interface UserRole {
  id: string
  name: string
  description: string
}

export interface UserPermission {
  id: string
  name: string
  resource: string
  action: string
}

export interface UserWithRoleAndPermissions {
  user: UserWithRole
  role: UserRole | null
  permissions: UserPermission[]
}

/**
 * Get user's role and permissions
 */
export async function getUserRoleAndPermissions(userId: string): Promise<UserWithRoleAndPermissions | null> {
  try {
    // Get user with role information
    const { data: userData, error: userError } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    if (!userData) return null

    // Get user's permissions through their role
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('role_permissions')
      .select(`
        permissions!inner(*)
      `)
      .eq('role_id', userData.role_id)

    if (permissionsError) throw permissionsError

    const permissions = permissionsData?.map((rp: any) => rp.permissions) || []

    return {
      user: userData,
      role: userData.role_id ? {
        id: userData.role_id,
        name: userData.role_name,
        description: userData.role_description
      } : null,
      permissions
    }
  } catch (error) {
    console.error('Error getting user role and permissions:', error)
    return null
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: UserPermission[], resource: string, action: string): boolean {
  return userPermissions.some(permission => 
    permission.resource === resource && permission.action === action
  )
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole | null, roleName: string): boolean {
  return userRole?.name === roleName
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'super_admin')
}

/**
 * Check if user is a practitioner
 */
export function isPractitioner(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'practitioner')
}

/**
 * Check if user is a client
 */
export function isClient(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'client')
}

/**
 * Check if user can view all appointments (super admin or practitioner)
 */
export function canViewAllAppointments(userRole: UserRole | null): boolean {
  return isSuperAdmin(userRole) || isPractitioner(userRole)
}

/**
 * Check if user can only view their own appointments (client)
 */
export function canViewOwnAppointmentsOnly(userRole: UserRole | null): boolean {
  return isClient(userRole)
}

/**
 * Get filtered appointments based on user role
 */
export async function getFilteredAppointments(userId: string, userRole: UserRole | null) {
  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        users!appointments_user_id_fkey(first_name, last_name, email, phone),
        practitioners:users!appointments_practitioner_id_fkey(first_name, last_name, email, phone)
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)

    // If user is a client, only show their own appointments
    if (canViewOwnAppointmentsOnly(userRole)) {
      query = query.eq('user_id', userId)
    }
    // Super admin and practitioners can see all appointments

    const { data, error } = await query.order('appointment_date', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching filtered appointments:', error)
    return []
  }
}
