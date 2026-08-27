import { describe, expect, it } from 'vitest'
import { normalizeLocationId, normalizePit } from './gohighlevel-api.service'

describe('GoHighLevel PIT helpers', () => {
  it('strips a Bearer prefix from the pasted token', () => {
    expect(normalizePit('  Bearer pit_abc  ')).toBe('pit_abc')
  })

  it('extracts a location id from a GHL location URL', () => {
    expect(
      normalizeLocationId('https://app.gohighlevel.com/v2/location/ve9EPM428h8vShlRW1KT/settings'),
    ).toBe('ve9EPM428h8vShlRW1KT')
  })
})
