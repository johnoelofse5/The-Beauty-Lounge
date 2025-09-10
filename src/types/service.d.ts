export interface Service {
    id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price?: number;
    category_id?: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface ServiceWithCategory extends Service {
    category_name?: string;
    category_description?: string;
    category_display_order?: number;
}