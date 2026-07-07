import { describe, expect, it } from 'vitest'
import {
  SAFE_FALLBACK_SOCIAL_TSX,
  looksLikeInvalidCreativeTsx,
} from './creative-tsx-validation'

describe('creative TSX validation', () => {
  it('accepts generated component sources and rejects raw CSS or empty code', () => {
    expect(looksLikeInvalidCreativeTsx('function SocialCreative() { return <div /> }')).toBe(false)
    expect(looksLikeInvalidCreativeTsx('const AdCreative = () => <div />')).toBe(false)
    expect(looksLikeInvalidCreativeTsx('')).toBe(true)
    expect(looksLikeInvalidCreativeTsx(':root { --brand: red; }')).toBe(true)
    expect(looksLikeInvalidCreativeTsx('<style>.card { color: red; }</style>')).toBe(true)
  })

  it('keeps a social fallback component available for invalid creatives', () => {
    expect(SAFE_FALLBACK_SOCIAL_TSX).toContain('function SocialCreative')
    expect(SAFE_FALLBACK_SOCIAL_TSX).toContain('Creative could not render')
  })
})
