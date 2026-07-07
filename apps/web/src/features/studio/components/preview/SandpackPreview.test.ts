import { describe, expect, it } from 'vitest'
import { shouldUseSafeFallbackCode } from './SandpackPreview'

describe('shouldUseSafeFallbackCode', () => {
  it('does not force fallback from contract metadata alone', () => {
    const shouldFallback = shouldUseSafeFallbackCode(
      'const Page = () => <div />\nexport default Page',
      { normalization_applied: [], recovery_applied: [], used_fallback: true },
    )
    expect(shouldFallback).toBe(false)
  })

  it('returns true for stylesheet-like code', () => {
    const shouldFallback = shouldUseSafeFallbackCode(':root { --x: 1; } .hero { color: white; }')
    expect(shouldFallback).toBe(true)
  })

  it('returns false for valid component-like TSX', () => {
    const shouldFallback = shouldUseSafeFallbackCode(
      'const Page = () => <div>Hello</div>\nexport default Page',
      { normalization_applied: [], recovery_applied: [], used_fallback: false },
    )
    expect(shouldFallback).toBe(false)
  })
})
