import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS, validateResource, type ResourceInput } from '@/lib/resources'

const valid: ResourceInput = { business_name: 'Acme Cleaning', category: 'cleaner', description: 'Great' }

describe('resources domain', () => {
  it('exposes the category list with labels', () => {
    expect(CATEGORIES).toContain('cleaner')
    expect(CATEGORY_LABELS.hot_tub).toBe('Hot Tub Service')
    expect(CATEGORIES.every((c) => typeof CATEGORY_LABELS[c] === 'string')).toBe(true)
  })
  it('accepts a valid resource', () => {
    expect(validateResource(valid).ok).toBe(true)
  })
  it('requires a business name', () => {
    expect(validateResource({ ...valid, business_name: '  ' }).ok).toBe(false)
  })
  it('rejects an unknown category', () => {
    expect(validateResource({ ...valid, category: 'spaceship' as unknown as ResourceInput['category'] }).ok).toBe(false)
  })
  it('rejects a malformed website', () => {
    expect(validateResource({ ...valid, website: 'not a url' }).ok).toBe(false)
  })
  it('accepts a bare-domain website', () => {
    expect(validateResource({ ...valid, website: 'example.com' }).ok).toBe(true)
  })
})
