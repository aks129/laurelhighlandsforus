export const STATUSES = ['available', 'claimed', 'gone'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  available: 'Available',
  claimed: 'Claimed',
  gone: 'Gone',
}

export interface Classified {
  id: string
  author_id: string
  title: string
  description: string
  price: number | null
  status: Status
  is_removed: boolean
  created_at: string
  updated_at: string
}

export interface ClassifiedImage {
  id: string
  classified_id: string
  storage_path: string
  sort_order: number
}

export interface ClassifiedInput {
  title: string
  description: string
  price: number | null
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'Free'
  const n = Number(price)
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export function validateClassified(input: ClassifiedInput): ValidationResult {
  if (!input.title || input.title.trim().length === 0) {
    return { ok: false, error: 'Please add a title.' }
  }
  if (input.price !== null && (Number.isNaN(input.price) || input.price < 0)) {
    return { ok: false, error: 'Price can’t be negative.' }
  }
  return { ok: true }
}
