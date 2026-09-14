/**
 * Minimal path reader for note-taker field maps. Dot notation, `[]` marks an
 * array to iterate: `transcript.speaker_blocks[].words` reads `words` from
 * every block. No dependency, no expressions, no wildcards beyond `[]`.
 */

export const FIELD_PATH_PATTERN = /^[A-Za-z0-9_$-]+(\[\])?(\.[A-Za-z0-9_$-]+(\[\])?)*$/

type Segment = { key: string; list: boolean }

export function isFieldPath(value: unknown): value is string {
  return typeof value === 'string' && FIELD_PATH_PATTERN.test(value)
}

function segments(path: string): Segment[] {
  return path.split('.').map((part) => {
    const list = part.endsWith('[]')
    return { key: list ? part.slice(0, -2) : part, list }
  })
}

function step(value: unknown, key: string): unknown {
  if (Array.isArray(value)) return undefined
  if (!value || typeof value !== 'object') return undefined
  return (value as Record<string, unknown>)[key]
}

/** First scalar or object at `path`; the first element when a `[]` segment is crossed. */
export function readValue(root: unknown, path: string): unknown {
  let current: unknown = root
  for (const segment of segments(path)) {
    current = step(current, segment.key)
    if (segment.list) {
      if (!Array.isArray(current)) return undefined
      current = current[0]
    }
    if (current === undefined || current === null) return undefined
  }
  return current
}

/** Every value at `path`, expanding each `[]` segment; empty when nothing matches. */
export function readList(root: unknown, path: string): unknown[] {
  let current: unknown[] = [root]
  for (const segment of segments(path)) {
    const next: unknown[] = []
    for (const item of current) {
      const value = step(item, segment.key)
      if (value === undefined || value === null) continue
      if (segment.list) {
        if (Array.isArray(value)) next.push(...value)
      } else {
        next.push(value)
      }
    }
    current = next
  }
  return current
}

/** Text at `path` (strings and finite numbers), trimmed, or null. */
export function readText(root: unknown, path: string | undefined): string | null {
  if (!path) return null
  const value = readValue(root, path)
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}
