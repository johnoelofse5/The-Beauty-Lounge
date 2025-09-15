export interface LookupType {
  id: string
  name: string
  lookup_type_code: string
  description?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Lookup {
  id: string
  lookup_type_id: string
  value: string
  secondary_value?: string
  display_order: number
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface LookupWithType extends Lookup {
  lookup_type: LookupType
}
