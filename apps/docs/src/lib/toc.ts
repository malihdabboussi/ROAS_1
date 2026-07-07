import type { TocItem } from './types'

export type { TocItem }

export function extractToc(raw: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const items: TocItem[] = []
  let match

  while ((match = headingRegex.exec(raw)) !== null) {
    const hashes = match[1]
    const text = match[2]
    if (!hashes || !text) continue
    const level = hashes.length
    const title = text.trim()
    const id = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')

    items.push({ id, title, level })
  }

  return items
}
