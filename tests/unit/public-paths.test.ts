import { describe, it, expect } from 'vitest'
import { isPublicPath } from '@/lib/auth/public-paths'

describe('isPublicPath', () => {
  it('treats the landing page as public', () => {
    expect(isPublicPath('/')).toBe(true)
  })
  it('treats login and auth routes as public', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/auth/callback')).toBe(true)
    expect(isPublicPath('/auth/confirm')).toBe(true)
  })
  it('treats member routes as private', () => {
    expect(isPublicPath('/home')).toBe(false)
    expect(isPublicPath('/account')).toBe(false)
    expect(isPublicPath('/onboarding')).toBe(false)
  })
})
