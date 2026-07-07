export interface ParsedPresentationSections {
  preamble: string
  sections: string[]
  postamble: string
}

/**
 * Parse a presentation HTML/TSX string into its top-level <section> blocks.
 * Uses balanced-tag matching to handle nested tags inside each section.
 */
export function parsePresentationSections(html: string): ParsedPresentationSections | null {
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

export function rebuildPresentationHtml(parsed: ParsedPresentationSections): string {
  return parsed.preamble + parsed.sections.join('\n\n') + parsed.postamble
}

export function remapSlideIndexAfterReorder(
  activeIndex: number | null,
  fromIndex: number,
  toIndex: number,
): number | null {
  if (activeIndex === null) return null
  if (activeIndex === fromIndex) return toIndex
  if (fromIndex < toIndex) {
    if (activeIndex > fromIndex && activeIndex <= toIndex) return activeIndex - 1
  } else if (activeIndex >= toIndex && activeIndex < fromIndex) {
    return activeIndex + 1
  }
  return activeIndex
}
