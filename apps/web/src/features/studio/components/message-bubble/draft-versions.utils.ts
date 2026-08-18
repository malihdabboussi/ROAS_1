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

/** Draft cards are send-ready plain text, so Markdown chrome must not leak into the editor. */
export function draftMarkdownToPlainText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
    .replace(/(^|\s)(?:\*\*|__)(?=\S)/g, '$1')
    .replace(/(?:\*\*|__)(?=\s|[.,!?;:]|$)/g, '')
    .replace(/(^|\s)(?:\*|_)(?=\S)/g, '$1')
    .replace(/(?:\*|_)(?=\s|[.,!?;:]|$)/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .trim()
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
    pendingVersions.push({ label, text: draftMarkdownToPlainText(match[2] ?? '') })
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

/**
 * Claude-style acknowledgment when sending an edited draft version back into
 * the chat composer so Pixel can confirm ("Sounds good") rather than
 * receiving bare copy with no context.
 */
export function buildDraftComposerUseText(input: {
  draftText: string
  versionIndex: number
  versionCount: number
  edited: boolean
}): string {
  const draft = input.draftText.trim()
  if (!draft) return ''

  const letter = VERSION_LETTERS[input.versionIndex]
  const optionLabel = input.versionCount > 1 && letter ? `option ${letter}` : null

  let lead: string
  if (optionLabel && input.edited) {
    lead = `I used ${optionLabel} and made some edits. Here it is.`
  } else if (optionLabel) {
    lead = `I used ${optionLabel}. Here it is.`
  } else if (input.edited) {
    lead = 'I made some edits. Here it is.'
  } else {
    lead = 'Here it is.'
  }

  return `${lead}\n\n${draft}`
}
