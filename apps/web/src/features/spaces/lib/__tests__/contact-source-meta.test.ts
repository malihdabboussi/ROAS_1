import { describe, expect, it } from 'vitest'
import { CONTACT_SOURCE_CHANNELS, contactSourceMeta } from '../contact-source-meta'

describe('contactSourceMeta', () => {
  it('covers all eight canonical channels', () => {
    expect([...CONTACT_SOURCE_CHANNELS].sort()).toEqual(
      [
        'automation',
        'form',
        'funnel',
        'import',
        'integration',
        'manual',
        'telegram',
        'widget',
      ].sort(),
    )
    for (const channel of CONTACT_SOURCE_CHANNELS) {
      const meta = contactSourceMeta(channel)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.badgeClass.length).toBeGreaterThan(0)
      expect(meta.icon).toBeTruthy()
    }
  })

  it('falls back gracefully for null or unknown values', () => {
    expect(contactSourceMeta(null).label).toBe('Unknown')
    expect(contactSourceMeta('something-else').label).toBe('Unknown')
  })

  it('gives channels distinct labels', () => {
    const labels = CONTACT_SOURCE_CHANNELS.map((c) => contactSourceMeta(c).label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
