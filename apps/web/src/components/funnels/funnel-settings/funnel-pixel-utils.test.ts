import { describe, expect, it } from 'vitest'
import { getFunnelPixelsFromMetadata } from './funnel-pixel-utils'

describe('getFunnelPixelsFromMetadata', () => {
  it('returns empty for null', () => {
    expect(getFunnelPixelsFromMetadata(null)).toEqual([])
  })

  it('reads legacy meta_pixel_id', () => {
    const out = getFunnelPixelsFromMetadata({ meta_pixel_id: '12345678901' })
    expect(out).toEqual([{ id: '12345678901', source: 'manual' }])
  })
})
