export interface FileRowMeta {
  label: string
  glassClass: string
}

/** Artifact/document types → user-facing label + icon tile tint (badge-glass-*). */
const ARTIFACT_TYPE_META: Record<string, FileRowMeta> = {
  offer: { label: 'Offer', glassClass: 'badge-glass-orange' },
  avatar: { label: 'Avatar', glassClass: 'badge-glass-muted' },
  funnel: { label: 'Funnel', glassClass: 'badge-glass-purple' },
  presentation: { label: 'Presentation', glassClass: 'badge-glass-orange' },
  sequence: { label: 'Sequence', glassClass: 'badge-glass-green' },
  email: { label: 'Email', glassClass: 'badge-glass-green' },
  website: { label: 'Website', glassClass: 'badge-glass-cyan' },
  ad: { label: 'Ad', glassClass: 'badge-glass-red' },
  social_post: { label: 'Social Post', glassClass: 'badge-glass-orange' },
  form: { label: 'Form', glassClass: 'badge-glass-muted' },
  upload: { label: 'File', glassClass: 'badge-glass-muted' },
  image_upload: { label: 'Image', glassClass: 'badge-glass-yellow' },
  pdf: { label: 'PDF', glassClass: 'badge-glass-blue' },
}

const ATTACHMENT_KIND_META: Record<string, FileRowMeta> = {
  image: { label: 'Image', glassClass: 'badge-glass-yellow' },
  video: { label: 'Video', glassClass: 'badge-glass-yellow' },
  audio: { label: 'Audio', glassClass: 'badge-glass-yellow' },
  file: { label: 'File', glassClass: 'badge-glass-muted' },
}

function humanizeType(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

export function fileRowMeta(kind: string, artifactType?: string | null): FileRowMeta {
  const normalizedType = artifactType?.trim().toLowerCase() ?? ''
  if (normalizedType) {
    return (
      ARTIFACT_TYPE_META[normalizedType] ?? {
        label: humanizeType(normalizedType),
        glassClass: 'badge-glass-purple',
      }
    )
  }
  return ATTACHMENT_KIND_META[kind] ?? { label: 'Artifact', glassClass: 'badge-glass-purple' }
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function fileRowDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (dayDiff <= 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** "Presentation · 2h ago"; drops the time part once rows are a week old. */
export function fileRowSubtitle(label: string, iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return label
  const diffHours = Math.floor((now.getTime() - date.getTime()) / 3_600_000)
  if (diffHours < 1) return `${label} · just now`
  if (diffHours < 24) return `${label} · ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${label} · ${diffDays}d ago`
  return label
}

export interface FileRowDayGroup<T> {
  label: string
  rows: T[]
}

/** Sorts newest-first and buckets into Today / Yesterday / date sections. */
export function groupFileRowsByDay<T extends { createdAt: string }>(
  rows: T[],
  now: Date = new Date(),
): FileRowDayGroup<T>[] {
  const sorted = [...rows].sort((a, b) => {
    const left = Date.parse(a.createdAt)
    const right = Date.parse(b.createdAt)
    return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left)
  })
  const groups: FileRowDayGroup<T>[] = []
  for (const row of sorted) {
    const label = fileRowDayLabel(row.createdAt, now)
    const current = groups[groups.length - 1]
    if (current && current.label === label) {
      current.rows.push(row)
    } else {
      groups.push({ label, rows: [row] })
    }
  }
  return groups
}
