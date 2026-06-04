export const CATEGORIES = [
  'cleaner', 'handyman', 'contractor', 'landscaping', 'hot_tub', 'snow_removal', 'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  cleaner: 'Cleaner',
  handyman: 'Handyman',
  contractor: 'Contractor',
  landscaping: 'Landscaping',
  hot_tub: 'Hot Tub Service',
  snow_removal: 'Snow Removal',
  other: 'Other',
}

export interface Resource {
  id: string
  author_id: string
  category: Category
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  area_served: string | null
  description: string
  is_removed: boolean
  created_at: string
  updated_at: string
}

export interface ResourceInput {
  business_name: string
  category: Category
  description: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  area_served?: string | null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateResource(input: ResourceInput): ValidationResult {
  if (!input.business_name || input.business_name.trim().length === 0) {
    return { ok: false, error: 'Please enter a business or provider name.' }
  }
  if (!CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'Please choose a category.' }
  }
  if (input.website && input.website.trim().length > 0) {
    try {
      new URL(input.website.startsWith('http') ? input.website : `https://${input.website}`)
    } catch {
      return { ok: false, error: 'That website address doesn’t look valid.' }
    }
  }
  return { ok: true }
}
