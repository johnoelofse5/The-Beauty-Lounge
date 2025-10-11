import { supabase } from '@/lib/supabase'
import { PortfolioItem, PortfolioWithPractitioner, CreatePortfolioItemData, UpdatePortfolioItemData } from '@/types/portfolio'

export class PortfolioService {
  private static readonly BUCKET_NAME = 'portfolio-images'

  /**
   * Upload image to Supabase storage
   */
  static async uploadImage(file: File, practitionerId: string): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${practitionerId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, file)

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath)

    return {
      path: filePath,
      url: publicUrl
    }
  }

  /**
   * Delete image from Supabase storage
   */
  static async deleteImage(imagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([imagePath])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  }

  /**
   * Create a new portfolio item
   */
  static async createPortfolioItem(
    practitionerId: string,
    imageFile: File,
    data: CreatePortfolioItemData
  ): Promise<PortfolioItem> {
    
    const { path, url } = await this.uploadImage(imageFile, practitionerId)

    
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
        is_featured: data.is_featured || false
      })
      .select()
      .single()

    if (error) {
      
      await this.deleteImage(path)
      throw new Error(`Failed to create portfolio item: ${error.message}`)
    }

    return portfolioItem
  }

  /**
   * Get all portfolio items for a specific practitioner
   */
  static async getPractitionerPortfolio(practitionerId: string): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch portfolio: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all portfolio items with practitioner information
   */
  static async getAllPortfolioItems(): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select(`
        *,
        practitioner:users!practitioner_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch portfolio items: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get featured portfolio items
   */
  static async getFeaturedPortfolioItems(): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select(`
        *,
        practitioner:users!practitioner_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      throw new Error(`Failed to fetch featured portfolio items: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get portfolio items by category
   */
  static async getPortfolioByCategory(category: string): Promise<PortfolioWithPractitioner[]> {
    const { data, error } = await supabase
      .from('portfolio')
      .select(`
        *,
        practitioner:users!practitioner_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('category', category)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch portfolio by category: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update a portfolio item
   */
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
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update portfolio item: ${error.message}`)
    }

    return portfolioItem
  }

  /**
   * Delete a portfolio item
   */
  static async deletePortfolioItem(itemId: string): Promise<void> {
    
    const { data: item, error: fetchError } = await supabase
      .from('portfolio')
      .select('image_path')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch portfolio item: ${fetchError.message}`)
    }

    
    const { error: deleteError } = await supabase
      .from('portfolio')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (deleteError) {
      throw new Error(`Failed to delete portfolio item: ${deleteError.message}`)
    }

    
    if (item?.image_path) {
      await this.deleteImage(item.image_path)
    }
  }

  /**
   * Get available categories from service_categories table
   */
  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('name')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    return data?.map(category => category.name) || []
  }
}
