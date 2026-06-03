import { describe, it, expect } from 'vitest'
import { isProfileComplete, type Profile } from '@/lib/profile'

const base: Profile = {
  id: 'u1',
  email: 'a@b.com',
  full_name: null,
  phone: null,
  community: null,
  num_properties: null,
  role: 'member',
  onboarded: false,
  created_at: '2026-06-03T00:00:00Z',
}

describe('isProfileComplete', () => {
  it('is false when full_name or community is missing', () => {
    expect(isProfileComplete(base)).toBe(false)
    expect(isProfileComplete({ ...base, full_name: 'Jane' })).toBe(false)
    expect(isProfileComplete({ ...base, community: 'hidden_valley' })).toBe(false)
  })
  it('is true when full_name and community are present', () => {
    expect(isProfileComplete({ ...base, full_name: 'Jane', community: 'hidden_valley' })).toBe(true)
  })
})
