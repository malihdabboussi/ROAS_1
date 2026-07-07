import type {
  ContactEmailTimelineItem,
} from '../../services/contact-communications.service'

/** Carry already-fetched html bodies over a summary refetch (list omits bodies). */
export function mergeEmailBodies(
  prev: ContactEmailTimelineItem[],
  next: ContactEmailTimelineItem[],
): ContactEmailTimelineItem[] {
  const bodyById = new Map<string, string>()
  for (const e of prev) {
    if (e.html_body != null) bodyById.set(e.id, e.html_body)
  }
  if (bodyById.size === 0) return next
  return next.map((e) =>
    e.html_body == null && bodyById.has(e.id) ? { ...e, html_body: bodyById.get(e.id) ?? null } : e,
  )
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown time'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
