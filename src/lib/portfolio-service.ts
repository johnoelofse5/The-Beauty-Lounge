import { supabase } from '@/lib/supabase';
import {
  PortfolioItem,
  PortfolioWithPractitioner,
  CreatePortfolioItemData,
  UpdatePortfolioItemData,
} from '@/types/portfolio';

export class PortfolioService {
  private static readonly BUCKET_NAME = 'portfolio-images';

  static async uploadImage(
    file: File,
    practitionerId: string
  ): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${practitionerId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

    return { path: filePath, url: publicUrl };
  }

  static async deleteImage(imagePath: string): Promise<void> {
    const { error } = await supabase.storage.from(this.BUCKET_NAME).remove([imagePath]);

    if (error) throw new Error(`Failed to delete image: ${error.message}`);
  }

  static async createPortfolioItem(
    practitionerId: string,
    imageFile: File,
    data: CreatePortfolioItemData
  ): Promise<PortfolioItem> {
    const { path, url } = await this.uploadImage(imageFile, practitionerId);

    const { data: portfolioItem, error } = await supabase
      .from('portfolio')
      .insert({
        practitioner_id: practitionerId,
        title: data.title,
        description: data.description,
        image_url: url,
        image_path: path,
        category: data.category,
        tags: data.tags || [],
        is_featured: data.is_featured || false,
      })
      .select()
      .single();

    if (error) {
      await this.deleteImage(path);
      throw new Error(`Failed to create portfolio item: ${error.message}`);
    }

    return portfolioItem;
  }

  static async getPractitionerPortfolio(practitionerId: string): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`);

    return data || [];
  }

  private static async enrichWithPractitioners(
    items: PortfolioItem[]
  ): Promise<PortfolioWithPractitioner[]> {
    if (!items || items.length === 0) return [];

    const practitionerIds = [...new Set(items.map((item) => item.practitioner_id).filter(Boolean))];

    const { data: practitioners, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .in('id', practitionerIds);

    if (error) throw new Error(`Failed to fetch practitioners: ${error.message}`);

    const practitionersMap = new Map(practitioners?.map((p) => [p.id, p]) || []);

    return items.map((item) => ({
      ...item,
      practitioner: practitionersMap.get(item.practitioner_id) || {
        id: item.practitioner_id,
        first_name: '',
        last_name: '',
        email: '',
      },
    }));
  }

  static async getAllPortfolioItems(): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch portfolio items: ${error.message}`);

    return this.enrichWithPractitioners(data || []);
  }

  static async getFeaturedPortfolioItems(): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw new Error(`Failed to fetch featured portfolio items: ${error.message}`);

    return this.enrichWithPractitioners(data || []);
  }

  static async getPortfolioByCategory(category: string): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch portfolio by category: ${error.message}`);

    return this.enrichWithPractitioners(data || []);
  }

  static async updatePortfolioItem(
    itemId: string,
    data: UpdatePortfolioItemData
  ): Promise<PortfolioItem> {
    const { data: portfolioItem, error } = await supabase
      .from('portfolio')
      .update({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        is_featured: data.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update portfolio item: ${error.message}`);

    return portfolioItem;
  }

  static async deletePortfolioItem(itemId: string): Promise<void> {
    const { data: item, error: fetchError } = await supabase
      .from('portfolio')
      .select('image_path')
      .eq('id', itemId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch portfolio item: ${fetchError.message}`);

    const { error: deleteError } = await supabase
      .from('portfolio')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (deleteError) throw new Error(`Failed to delete portfolio item: ${deleteError.message}`);

    if (item?.image_path) await this.deleteImage(item.image_path);
  }

  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('name')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

    return data?.map((category) => category.name) || [];
  }
}
