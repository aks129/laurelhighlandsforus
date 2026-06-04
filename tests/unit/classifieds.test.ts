import { describe, it, expect } from 'vitest'
import {
  STATUSES,
  STATUS_LABELS,
  formatPrice,
  validateClassified,
  type ClassifiedInput,
} from '@/lib/classifieds'

const valid: ClassifiedInput = { title: 'Queen bed', description: 'Good shape', price: 50 }

describe('classifieds domain', () => {
  it('formats a price and Free', () => {
    expect(formatPrice(50)).toBe('$50')
    expect(formatPrice(19.99)).toBe('$19.99')
    expect(formatPrice(null)).toBe('Free')
  })
  it('lists statuses with labels', () => {
    expect(STATUSES).toEqual(['available', 'claimed', 'gone'])
    expect(STATUS_LABELS.available).toBe('Available')
  })
  it('accepts a valid listing and requires a title', () => {
    expect(validateClassified(valid).ok).toBe(true)
    expect(validateClassified({ ...valid, title: '  ' }).ok).toBe(false)
  })
  it('rejects a negative price', () => {
    expect(validateClassified({ ...valid, price: -5 }).ok).toBe(false)
  })
  it('allows a free (null price) listing', () => {
    expect(validateClassified({ ...valid, price: null }).ok).toBe(true)
  })
})
