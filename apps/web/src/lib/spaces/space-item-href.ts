export type SpaceItemRoute = { spaceId: string; itemId: string }

export function buildSpaceItemHref(spaceId: string, itemId: string): string {
  const params = new URLSearchParams({ space: spaceId.trim(), item: itemId.trim() })
  return `/spaces?${params.toString()}`
}

export function parseSpaceItemHref(href: string | null | undefined): SpaceItemRoute | null {
  if (typeof href !== 'string' || !href.trim()) return null

  const url = new URL(href, 'https://vibey.local')
  if (url.pathname === '/spaces') {
    const spaceId = url.searchParams.get('space')?.trim()
    const itemId = url.searchParams.get('item')?.trim()
    return spaceId && itemId ? { spaceId, itemId } : null
  }

  const legacyMatch = /^\/spaces\/([^/]+)\/([^/?#]+)/.exec(url.pathname)
  if (!legacyMatch?.[1] || !legacyMatch[2]) return null
  return {
    spaceId: decodeURIComponent(legacyMatch[1]),
    itemId: decodeURIComponent(legacyMatch[2]),
  }
}

export function normalizeSpaceItemHref(href: string | null | undefined): string | null {
  const route = parseSpaceItemHref(href)
  return route ? buildSpaceItemHref(route.spaceId, route.itemId) : null
}
