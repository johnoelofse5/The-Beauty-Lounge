export interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface PermissionWithRoles extends Permission {
  roles: Role[]
}

export interface UserWithRole {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_practitioner: boolean
  is_active: boolean
  is_deleted: boolean
  role_id: string | null
  role_name: string | null
  role_description: string | null
  created_at: string
  updated_at: string
}
