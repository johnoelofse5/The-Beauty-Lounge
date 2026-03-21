export interface ServiceOption {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  price_adjustment: number;
  duration_adjustment_minutes: number;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceOptionFormData {
  name: string;
  description: string;
  price_adjustment: number;
  duration_adjustment_minutes: number;
  display_order: number;
}

export type SelectedServiceOptions = Record<string, ServiceOption | null>;
