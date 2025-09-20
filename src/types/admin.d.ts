// Admin-specific interfaces and types

export interface InputWithErrorProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export interface AdminUser {
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

export interface AdminRole {
  id: string
  name: string
  description: string
  is_active: boolean
  is_deleted: boolean
}

export interface UserFormData {
  email: string
  first_name: string
  last_name: string
  phone: string
  is_practitioner: boolean
  role_id: string | null
}

export interface ServiceFormData {
  name: string
  description: string
  duration_minutes: number
  price: number
  category_id: string
}

export interface CategoryFormData {
  name: string
  description: string
  display_order: number
}

export type UserViewMode = 'all' | 'practitioners' | 'clients'
