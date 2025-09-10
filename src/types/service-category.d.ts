export interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
} 