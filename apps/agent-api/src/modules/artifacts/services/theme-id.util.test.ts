import { describe, expect, it } from 'vitest'
import { canAccessThemeForUser, normalizeThemeId } from './theme-id.util'

describe('theme-id util', () => {
  it('normalizes valid UUID strings', () => {
    expect(normalizeThemeId(' 550e8400-e29b-41d4-a716-446655440000 ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  it('rejects invalid UUID values', () => {
    expect(normalizeThemeId('not-a-uuid')).toBeNull()
    expect(normalizeThemeId('')).toBeNull()
    expect(normalizeThemeId(null)).toBeNull()
  })

  it('allows access to system themes', () => {
    expect(canAccessThemeForUser({ is_system: true, user_id: 'someone-else' }, 'user-1')).toBe(true)
  })

  it('allows access to user-owned themes', () => {
    expect(canAccessThemeForUser({ is_system: false, user_id: 'user-1' }, 'user-1')).toBe(true)
  })

  it('rejects access to other users themes', () => {
    expect(canAccessThemeForUser({ is_system: false, user_id: 'user-2' }, 'user-1')).toBe(false)
  })
})
