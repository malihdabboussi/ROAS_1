const DEFAULT_BRAIN_READ_LIMIT = 20
const MAX_BRAIN_READ_LIMIT = 20

type CursorPayload = {
  v: 1
  offset: number
  scope: string
}

type ResolveOptions = {
  cursorScope: string
}

export type BrainReadPageRequest = {
  limit: number
  fetchLimit: number
  offset: number
  cursor: string | null
  cursorScope: string
}

export type BrainReadPagination = {
  limit: number
  cursor: string | null
  next_cursor: string | null
  has_more: boolean
}

export function buildBrainReadCursorScope(
  action: string,
  parts: Record<string, unknown>,
): string {
  const normalizedParts = Object.keys(parts)
    .sort()
    .map((key) => `${key}:${String(parts[key] ?? '')}`)
    .join('|')
  return `${action}|${normalizedParts}`
}

export function resolveBrainReadPageRequest(
  input: Record<string, unknown>,
  options: ResolveOptions,
): BrainReadPageRequest | { error: string } {
  const limit = normalizeLimit(input.limit)
  const cursor = typeof input.cursor === 'string' ? input.cursor.trim() : ''
  if (!cursor) {
    return {
      limit,
      fetchLimit: limit + 1,
      offset: 0,
      cursor: null,
      cursorScope: options.cursorScope,
    }
  }

  const payload = decodeCursor(cursor)
  if (!payload || payload.scope !== options.cursorScope) {
    return {
      error:
        'cursor is invalid or does not match the current Brain filters. Start without cursor, then use pagination.next_cursor from the response.',
    }
  }

  return {
    limit,
    fetchLimit: limit + 1,
    offset: payload.offset,
    cursor,
    cursorScope: options.cursorScope,
  }
}

export function buildBrainReadPage<T>(
  pageRequest: BrainReadPageRequest,
  rows: T[],
): {
  items: T[]
  pagination: BrainReadPagination
} {
  const items = rows.slice(0, pageRequest.limit)
  const hasMore = rows.length > pageRequest.limit
  return {
    items,
    pagination: {
      limit: pageRequest.limit,
      cursor: pageRequest.cursor,
      next_cursor: hasMore
        ? encodeCursor({
            v: 1,
            offset: pageRequest.offset + items.length,
            scope: pageRequest.cursorScope,
          })
        : null,
      has_more: hasMore,
    },
  }
}

function normalizeLimit(value: unknown): number {
  const requestedLimit = typeof value === 'number' ? value : DEFAULT_BRAIN_READ_LIMIT
  return Math.max(1, Math.min(Math.floor(requestedLimit), MAX_BRAIN_READ_LIMIT))
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const payload = JSON.parse(raw) as Partial<CursorPayload>
    if (payload.v !== 1) return null
    if (typeof payload.scope !== 'string') return null
    if (typeof payload.offset !== 'number' || !Number.isFinite(payload.offset)) return null
    return {
      v: 1,
      offset: Math.max(0, Math.floor(payload.offset)),
      scope: payload.scope,
    }
  } catch {
    return null
  }
}
