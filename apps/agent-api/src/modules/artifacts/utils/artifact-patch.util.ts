export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let idx = 0
  for (;;) {
    const next = haystack.indexOf(needle, idx)
    if (next === -1) return count
    count += 1
    idx = next + needle.length
  }
}

export function validatePatchValue(patchType: 'text' | 'className', value: string): string | null {
  if (value.length === 0) return 'value must be a non-empty string'
  if (patchType === 'text') {
    if (/[<>{}]/.test(value)) return 'text value cannot include <, >, {, or }'
    return null
  }
  if (/["'\n\r{}]/.test(value)) return 'className value cannot include quotes, newlines, {, or }'
  return null
}

export type PatchStrategy = 'marker' | 'fallback'

export interface PatchResult {
  success: boolean
  nextHtml?: string
  strategy?: PatchStrategy
  error?: string
}

/**
 * Apply a marker-based or fallback find/replace patch to a TSX/HTML string.
 * Shared by funnel pages and presentations.
 */
export function applyTsxPatch(input: {
  originalHtml: string
  markerId?: string
  patchType: 'text' | 'className'
  value?: string
  fallbackFind?: string
  fallbackReplace?: string
}): PatchResult {
  const { originalHtml, markerId, patchType, value, fallbackFind, fallbackReplace } = input
  let nextHtml: string | null = null
  let strategy: PatchStrategy | null = null

  if (markerId) {
    const markerEsc = escapeRegExp(markerId)
    const re = new RegExp(
      `(<([A-Za-z][\\w:-]*)\\b[^>]*\\bdata-vibey-id\\s*=\\s*(["'])${markerEsc}\\3[^>]*>)([\\s\\S]*?)(</\\2\\s*>)`,
      'g',
    )
    const matches = Array.from(originalHtml.matchAll(re))
    if (matches.length === 1) {
      const m = matches[0]!
      const full = m[0] as string
      const open = m[1] as string
      const inner = m[4] as string
      const close = m[5] as string

      if (patchType === 'text') {
        if (!value) return { success: false, error: 'value required for text patch' }
        if (/[<>{}]/.test(inner)) {
          return {
            success: false,
            error:
              'MARKER_TARGET_NOT_TEXT_ONLY: Marker must be on a text-only element (no nested tags or JSX expressions). Wrap the text in a <span data-vibey-id="...">Text</span> and patch that.',
          }
        }
        nextHtml = originalHtml.replace(full, `${open}${value}${close}`)
        strategy = 'marker'
      } else {
        if (!value) return { success: false, error: 'value required for className patch' }
        const classMatches = Array.from(open.matchAll(/className\s*=\s*(["'])([\s\S]*?)\1/g))
        if (classMatches.length !== 1) {
          return {
            success: false,
            error:
              classMatches.length === 0
                ? 'MARKER_TARGET_HAS_NO_CLASSNAME: className patch requires a className="..." on the marked element'
                : 'MARKER_TARGET_HAS_MULTIPLE_CLASSNAME: className patch found multiple className attributes',
          }
        }
        const classRe = /className\s*=\s*(["'])([\s\S]*?)\1/
        const nextOpen = open.replace(classRe, (_whole, q: string) => `className=${q}${value}${q}`)
        nextHtml = originalHtml.replace(full, `${nextOpen}${inner}${close}`)
        strategy = 'marker'
      }
    } else if (matches.length > 1) {
      return {
        success: false,
        error: `MARKER_NOT_UNIQUE: Found ${matches.length} occurrences of data-vibey-id="${markerId}". Marker IDs must be unique.`,
      }
    }
  }

  if (!nextHtml) {
    const find = fallbackFind
    const replace = fallbackReplace
    if (!find || replace === undefined) {
      return {
        success: false,
        error: markerId
          ? `MARKER_NOT_FOUND: data-vibey-id="${markerId}" not found. Provide fallback_find/fallback_replace or update once to include markers.`
          : 'marker_id required OR fallback_find/fallback_replace required',
      }
    }

    const occurrences = countOccurrences(originalHtml, find)
    if (occurrences === 0) {
      return { success: false, error: 'FALLBACK_FIND_NOT_FOUND: fallback_find string not found' }
    }
    if (occurrences > 1) {
      return {
        success: false,
        error: `FALLBACK_FIND_NOT_UNIQUE: fallback_find matched ${occurrences} times. Provide a more specific snippet.`,
      }
    }

    nextHtml = originalHtml.replace(find, replace)
    strategy = 'fallback'
  }

  return { success: true, nextHtml: nextHtml!, strategy: strategy! }
}

export interface ParsedSections {
  preamble: string
  sections: string[]
  postamble: string
}

/**
 * Parse a presentation TSX string into its top-level <section> blocks.
 * Uses balanced-tag matching to handle nested tags inside each section.
 */
export function parsePresentationSections(html: string): ParsedSections | null {
  const sectionOpenRe = /<section\b/gi
  const ranges: { start: number; end: number }[] = []
  let match: RegExpExecArray | null

  while ((match = sectionOpenRe.exec(html)) !== null) {
    const start = match.index
    let depth = 0
    let i = start
    let end = -1

    while (i < html.length) {
      const openIdx = html.indexOf('<section', i)
      const closeIdx = html.indexOf('</section', i)

      if (depth === 0 && i === start) {
        depth = 1
        i = start + '<section'.length
        continue
      }

      if (closeIdx === -1) break

      if (openIdx !== -1 && openIdx < closeIdx) {
        depth += 1
        i = openIdx + '<section'.length
      } else {
        depth -= 1
        if (depth === 0) {
          const closingBracket = html.indexOf('>', closeIdx + '</section'.length)
          end = closingBracket !== -1 ? closingBracket + 1 : closeIdx + '</section>'.length
          break
        }
        i = closeIdx + '</section'.length
      }
    }

    if (end === -1) return null
    ranges.push({ start, end })
    sectionOpenRe.lastIndex = end
  }

  if (ranges.length === 0) return null

  const preamble = html.slice(0, ranges[0]!.start)
  const postamble = html.slice(ranges[ranges.length - 1]!.end)
  const sections = ranges.map((r) => html.slice(r.start, r.end))

  return { preamble, sections, postamble }
}

export function rebuildPresentationHtml(parsed: ParsedSections): string {
  return parsed.preamble + parsed.sections.join('\n\n') + parsed.postamble
}
