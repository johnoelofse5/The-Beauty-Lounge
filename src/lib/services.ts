import { supabase } from './supabase';
import { Service, ServiceWithCategory } from '@/types/service';
import { Category } from '@/types/service-category';
import { ServiceOption, ServiceOptionFormData } from '@/types/service-option';

export async function getServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getServices:', error);
    return [];
  }
}

export async function getServicesWithCategories(): Promise<ServiceWithCategory[]> {
  try {
    const { data, error } = await supabase.from('services_with_categories').select('*');

    if (error) {
      console.error('Error fetching services with categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getServicesWithCategories:', error);
    return [];
  }
}

export async function getServicesByCategory(): Promise<{
  [categoryName: string]: ServiceWithCategory[];
}> {
  try {
    const services = await getServicesWithCategories();

    const servicesByCategory: { [categoryName: string]: ServiceWithCategory[] } = {};

    services.forEach((service) => {
      const categoryName = service.category_name || 'Uncategorized';
      if (!servicesByCategory[categoryName]) {
        servicesByCategory[categoryName] = [];
      }
      servicesByCategory[categoryName].push(service);
    });

    return servicesByCategory;
  } catch (error) {
    console.error('Error in getServicesByCategory:', error);
    return {};
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCategories:', error);
    return [];
  }
}

export async function getServiceById(id: string): Promise<Service | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching service:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getServiceById:', error);
    return null;
  }
}

export async function getServiceOptions(serviceId: string): Promise<ServiceOption[]> {
  try {
    const { data, error } = await supabase
      .from('service_options')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching service options:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error in getServiceOptions:', error);
    return [];
  }
}

export async function getServiceOptionsMap(
  serviceIds: string[]
): Promise<Record<string, ServiceOption[]>> {
  if (serviceIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('service_options')
      .select('*')
      .in('service_id', serviceIds)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching service options map:', error);
      return {};
    }
    const map: Record<string, ServiceOption[]> = {};
    for (const option of data || []) {
      if (!map[option.service_id]) map[option.service_id] = [];
      map[option.service_id].push(option);
    }
    return map;
  } catch (error) {
    console.error('Error in getServiceOptionsMap:', error);
    return {};
  }
}

export async function createServiceOption(
  serviceId: string,
  form: ServiceOptionFormData
): Promise<ServiceOption | null> {
  try {
    const { data, error } = await supabase
      .from('service_options')
      .insert([
        {
          service_id: serviceId,
          name: form.name,
          description: form.description || null,
          price_adjustment: form.price_adjustment,
          duration_adjustment_minutes: form.duration_adjustment_minutes,
          display_order: form.display_order,
          is_active: true,
          is_deleted: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createServiceOption:', error);
    return null;
  }
}

export async function updateServiceOption(
  id: string,
  form: ServiceOptionFormData
): Promise<ServiceOption | null> {
  try {
    const { data, error } = await supabase
      .from('service_options')
      .update({
        name: form.name,
        description: form.description || null,
        price_adjustment: form.price_adjustment,
        duration_adjustment_minutes: form.duration_adjustment_minutes,
        display_order: form.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateServiceOption:', error);
    return null;
  }
}

export async function deleteServiceOption(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_options')
    .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export function formatPriceAdjustment(adjustment: number): string {
  if (adjustment === 0) return 'No extra charge';
  const sign = adjustment > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ZAR' }).format(adjustment)}`;
}

export function formatPrice(price: number | null | undefined): string {
  if (!price) return 'Contact for pricing';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ZAR',
  }).format(price);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}
