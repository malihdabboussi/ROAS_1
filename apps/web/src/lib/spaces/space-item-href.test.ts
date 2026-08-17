import { describe, expect, it } from 'vitest'
import { buildSpaceItemHref, normalizeSpaceItemHref, parseSpaceItemHref } from './space-item-href'

describe('space item href', () => {
  it('builds the supported Spaces query route', () => {
    expect(buildSpaceItemHref('space-1', 'item-1')).toBe('/spaces?space=space-1&item=item-1')
  })

  it('parses canonical, portal, and legacy Space item links', () => {
    expect(parseSpaceItemHref('/spaces?space=space-1&item=item-1')).toEqual({
      spaceId: 'space-1',
      itemId: 'item-1',
    })
    expect(parseSpaceItemHref('/spaces/space-1?item=item-1')).toEqual({
      spaceId: 'space-1',
      itemId: 'item-1',
    })
    expect(parseSpaceItemHref('/spaces/space-1/item-1')).toEqual({
      spaceId: 'space-1',
      itemId: 'item-1',
    })
  })

  it('normalizes old saved links without accepting unrelated routes', () => {
    expect(normalizeSpaceItemHref('/spaces/space-1/item-1')).toBe(
      '/spaces?space=space-1&item=item-1',
    )
    expect(normalizeSpaceItemHref('/spaces/space-1?item=item-1')).toBe(
      '/spaces?space=space-1&item=item-1',
    )
    expect(normalizeSpaceItemHref('/campaigns/campaign-1')).toBeNull()
  })
})
