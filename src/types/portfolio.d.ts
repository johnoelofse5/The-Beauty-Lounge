export interface PortfolioItem {
  id: string
  practitioner_id: string
  title: string
  description?: string
  image_url: string
  image_path: string
  category?: string
  tags?: string[]
  is_featured: boolean
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface PortfolioWithPractitioner extends PortfolioItem {
  practitioner: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface CreatePortfolioItemData {
  title: string
  description?: string
  category?: string
  tags?: string[]
  is_featured?: boolean
}

export interface UpdatePortfolioItemData {
  title?: string
  description?: string
  category?: string
  tags?: string[]
  is_featured?: boolean
}
