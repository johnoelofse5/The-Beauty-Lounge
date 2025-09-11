import { UserWithRole } from '@/types'
import { supabase } from './supabase'

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

    if (userError) {
      console.error('Error fetching user data:', userError)
      throw userError
    }

    if (!userData) {
      console.warn('No user data found for userId:', userId)
      return null
    }

    // If user has no role assigned, return basic user data
    if (!userData.role_id) {
      console.warn('User has no role assigned:', userId)
      return {
        user: userData,
        role: null,
        permissions: []
      }
    }

    // Get user's permissions through their role
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('role_permissions')
      .select(`
        permissions!inner(*)
      `)
      .eq('role_id', userData.role_id)

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError)
      throw permissionsError
    }

    const permissions = permissionsData?.map((rp: { permissions: UserPermission[] }) => rp.permissions).flat() || []

    return {
      user: userData,
      role: {
        id: userData.role_id,
        name: userData.role_name,
        description: userData.role_description
      },
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
    // First, get the appointments with basic filtering
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)

    // If user is a client, show appointments they booked
    if (canViewOwnAppointmentsOnly(userRole)) {
      query = query.eq('user_id', userId)
    }
    // If user is a practitioner, show appointments assigned to them as practitioner
    else if (isPractitioner(userRole)) {
      query = query.eq('practitioner_id', userId)
    }
    // If user is super admin, show all appointments
    else if (isSuperAdmin(userRole)) {
      // No additional filtering needed
    }
    // If user has no role or unknown role, show appointments where they are either client or practitioner
    else {
      query = query.or(`user_id.eq.${userId},practitioner_id.eq.${userId}`)
    }

    const { data: appointments, error } = await query.order('appointment_date', { ascending: true })

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    if (!appointments || appointments.length === 0) {
      return []
    }

    // Now get the user details for all unique user IDs (filter out null values)
    const userIds = [...new Set([
      ...appointments.map(apt => apt.user_id).filter(id => id !== null),
      ...appointments.map(apt => apt.practitioner_id).filter(id => id !== null)
    ])]

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      // Return appointments without user details if users query fails
      return appointments
    }


    // Create a map of user details
    const usersMap = new Map(users?.map(user => [user.id, user]) || [])

    // Combine appointments with user details
    const appointmentsWithUsers = appointments.map(appointment => ({
      ...appointment,
      client: usersMap.get(appointment.user_id) || null,
      practitioner: usersMap.get(appointment.practitioner_id) || null
    }))

    return appointmentsWithUsers
  } catch (error) {
    console.error('Error fetching filtered appointments:', error)
    return []
  }
}
