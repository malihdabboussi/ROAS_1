export type ShellWorkAreaRestore = {
  feature: string
  data: unknown
}

export type ShellWorkAreaPageTarget = {
  id: string
  title: string
  href: string
  /** Feature-owned payload so the memory menu can reopen the exact surface. */
  restore?: ShellWorkAreaRestore
  /** Chat that last used this work surface. */
  conversationId?: string
  /** True only when a feature explicitly bound this page to that conversation. */
  conversationBound?: true
}

const LAST_PAGE_MAP_LIMIT = 40

export function stampWorkAreaConversation(
  page: ShellWorkAreaPageTarget,
  conversationId: string | null | undefined,
): ShellWorkAreaPageTarget {
  const id = typeof conversationId === 'string' ? conversationId.trim() : ''
  if (!id) return page
  if (page.conversationId === id && page.conversationBound) return page
  return { ...page, conversationId: id, conversationBound: true }
}

export function sanitizeWorkAreaPage(value: unknown): ShellWorkAreaPageTarget | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ShellWorkAreaPageTarget>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.href !== 'string'
  ) {
    return null
  }
  const restore = sanitizeWorkAreaRestore(candidate.restore)
  const conversationId =
    typeof candidate.conversationId === 'string' ? candidate.conversationId.trim() : ''
  const conversationBound = candidate.conversationBound === true
  return {
    id: candidate.id,
    title: candidate.title,
    href: candidate.href,
    ...(restore ? { restore } : {}),
    ...(conversationId ? { conversationId } : {}),
    ...(conversationBound ? { conversationBound: true as const } : {}),
  }
}

export function sanitizeLastWorkAreaPageByConversation(
  value: unknown,
): Record<string, ShellWorkAreaPageTarget> {
  if (!value || typeof value !== 'object') return {}
  const next: Record<string, ShellWorkAreaPageTarget> = {}
  for (const [conversationId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!conversationId.trim()) continue
    const page = sanitizeWorkAreaPage(raw)
    if (!page?.conversationBound) continue
    next[conversationId] = stampWorkAreaConversation(page, conversationId)
  }
  return next
}

export function upsertLastWorkAreaPageByConversation(
  map: Record<string, ShellWorkAreaPageTarget>,
  conversationId: string,
  page: ShellWorkAreaPageTarget,
): Record<string, ShellWorkAreaPageTarget> {
  const stamped = stampWorkAreaConversation(page, conversationId)
  const without = Object.fromEntries(Object.entries(map).filter(([key]) => key !== conversationId))
  return {
    [conversationId]: stamped,
    ...without,
  }
}

export function trimLastWorkAreaPageByConversation(
  map: Record<string, ShellWorkAreaPageTarget>,
): Record<string, ShellWorkAreaPageTarget> {
  const entries = Object.entries(map)
  if (entries.length <= LAST_PAGE_MAP_LIMIT) return map
  return Object.fromEntries(entries.slice(0, LAST_PAGE_MAP_LIMIT))
}

export function rememberWorkAreaPage(
  map: Record<string, ShellWorkAreaPageTarget>,
  conversationId: string | null | undefined,
  page: ShellWorkAreaPageTarget,
): Record<string, ShellWorkAreaPageTarget> {
  const conversationKey =
    typeof conversationId === 'string' ? conversationId.trim() : page.conversationId?.trim() || ''
  if (!conversationKey) return map
  return trimLastWorkAreaPageByConversation(
    upsertLastWorkAreaPageByConversation(map, conversationKey, page),
  )
}

/** Simple Recents and `/home` own navigation; do not auto-push a remembered meeting. */
export function shouldRestoreWorkAreaHrefOnConversationChange(input: {
  menuStyle: 'simple' | 'advanced'
  pathname: string
}): boolean {
  if (input.menuStyle === 'simple') return false
  return input.pathname !== '/home'
}

/** Chat-switch contract: pinned artifacts keep the current screen; otherwise restore this chat's page. */
export function resolveWorkAreaPageForConversationChange(input: {
  artifactPinned: boolean
  nextConversationId: string | null
  lastWorkAreaPageByConversation: Record<string, ShellWorkAreaPageTarget>
}): ShellWorkAreaPageTarget | null {
  if (input.artifactPinned) return null
  const nextId = typeof input.nextConversationId === 'string' ? input.nextConversationId.trim() : ''
  if (!nextId) return null
  return input.lastWorkAreaPageByConversation[nextId] ?? null
}

export function workAreaHrefsMatch(left: string, right: string): boolean {
  return normalizeWorkAreaHref(left) === normalizeWorkAreaHref(right)
}

export function currentWorkAreaHref(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname
}

function sanitizeWorkAreaRestore(value: unknown): ShellWorkAreaRestore | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<ShellWorkAreaRestore>
  if (typeof candidate.feature !== 'string' || !candidate.feature.trim()) return undefined
  return { feature: candidate.feature, data: candidate.data }
}

function normalizeWorkAreaHref(href: string): string {
  const [path, query] = href.split('?')
  const params = new URLSearchParams(query ?? '')
  params.sort()
  const serialized = params.toString()
  return serialized ? `${path ?? href}?${serialized}` : (path ?? href)
}
