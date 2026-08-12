/**
 * Parses ```draft fenced blocks out of assistant markdown so they can render
 * as an editable versioned draft card instead of raw fenced code.
 *
 * Contract (authored by the agent):
 *   ```draft Full breakdown
 *   ...send-ready copy...
 *   ```
 *   ```draft Short version
 *   ...send-ready copy...
 *   ```
 * Consecutive draft fences separated only by whitespace group into one card
 * with version tabs. A missing label falls back to "Version A/B/…".
 */

export interface DraftVersion {
  label: string
  text: string
}

export type DraftContentSegment =
  | { kind: 'markdown'; markdown: string }
  | { kind: 'draft'; versions: DraftVersion[] }

const DRAFT_FENCE = /```draft[ \t]*([^\n]*)\n([\s\S]*?)```/g

const VERSION_LETTERS = 'ABCDEFGH'

function fallbackLabel(index: number): string {
  return `Version ${VERSION_LETTERS[index] ?? String(index + 1)}`
}

export function splitDraftSegments(content: string): DraftContentSegment[] {
  const segments: DraftContentSegment[] = []
  let cursor = 0
  let pendingVersions: DraftVersion[] = []

  const flushVersions = () => {
    if (pendingVersions.length === 0) return
    segments.push({ kind: 'draft', versions: pendingVersions })
    pendingVersions = []
  }

  DRAFT_FENCE.lastIndex = 0
  for (let match = DRAFT_FENCE.exec(content); match; match = DRAFT_FENCE.exec(content)) {
    const between = content.slice(cursor, match.index)
    if (between.trim().length > 0) {
      flushVersions()
      segments.push({ kind: 'markdown', markdown: between })
    }
    const label = match[1]?.trim() || fallbackLabel(pendingVersions.length)
    pendingVersions.push({ label, text: (match[2] ?? '').trim() })
    cursor = match.index + match[0].length
  }
  flushVersions()

  const tail = content.slice(cursor)
  if (tail.trim().length > 0) {
    segments.push({ kind: 'markdown', markdown: tail })
  }

  if (segments.length === 0) {
    return [{ kind: 'markdown', markdown: content }]
  }
  return segments
}

export function hasDraftFence(content: string): boolean {
  return content.includes('```draft')
}

/** Fired by DraftVersionsCard's "use" action; chat panels put the text in their composer. */
export const DRAFT_CARD_USE_EVENT = 'chat:draft-card-use'

export interface DraftCardUseDetail {
  text: string
}
