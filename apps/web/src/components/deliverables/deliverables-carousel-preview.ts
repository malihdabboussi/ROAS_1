import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { buildOfferStepPreviews } from '@/lib/artifacts/offer-step-preview'

export function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function stripHtml(raw: string): string {
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
}

function collectNestedText(value: unknown, out: string[], max = 8): void {
  if (out.length >= max) return
  const asText = toText(value)
  if (asText) {
    out.push(asText)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (out.length >= max) break
      collectNestedText(item, out, max)
    }
    return
  }
  if (!value || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  for (const key of ['summary', 'description', 'headline', 'title', 'subject', 'body', 'content']) {
    if (out.length >= max) break
    collectNestedText(obj[key], out, max)
  }
  for (const nested of Object.values(obj)) {
    if (out.length >= max) break
    collectNestedText(nested, out, max)
  }
}

export function excerpt(raw: string, max = 320): string {
  const normalized = normalizeDeliverableContent(stripHtml(raw)).replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max).trimEnd()}...`
}

export function buildOfferTextPreview(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const steps = buildOfferStepPreviews(row)
  if (steps.length > 0) return steps.map((s) => `${s.label}: ${s.preview}`).join('\n\n')
  const data = row as Record<string, unknown>
  const parts: string[] = []
  collectNestedText(data.name, parts, 1)
  for (let i = 1; i <= 6; i++) {
    collectNestedText(data[`step${i}_data`], parts, 8)
    if (parts.length >= 8) break
  }
  if (parts.length === 0) return null
  return excerpt(parts.join('\n'))
}

export function buildAvatarTextPreview(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const personaData =
    row.persona_data && typeof row.persona_data === 'object'
      ? (row.persona_data as Record<string, unknown>)
      : null
  if (!personaData) return null
  const demographics =
    personaData.demographics && typeof personaData.demographics === 'object'
      ? (personaData.demographics as Record<string, unknown>)
      : null

  const parts: string[] = []
  const career =
    toText(demographics?.occupation) ||
    toText(demographics?.career) ||
    toText(personaData.occupation)
  const age =
    toText(demographics?.age_range) || toText(demographics?.age) || toText(personaData.age_range)
  const summary =
    toText(personaData.comprehensive_summary) ||
    toText(personaData.background_profile) ||
    toText(personaData.bio) ||
    toText(personaData.summary)

  if (career) parts.push(`Career: ${career}`)
  if (age) parts.push(`Age: ${age}`)
  if (summary) parts.push(summary)
  if (parts.length === 0) return null
  return excerpt(parts.join('\n\n'))
}

export function buildSequenceTextPreview(seq: unknown): string | null {
  if (!seq || typeof seq !== 'object') return null
  const row = seq as Record<string, unknown>
  const emails = Array.isArray(row.sequence_emails)
    ? (row.sequence_emails as Array<Record<string, unknown>>)
    : []
  const lines: string[] = []
  for (let i = 0; i < Math.min(emails.length, 3); i++) {
    const email = emails[i]
    if (!email) continue
    const subject = toText(email.subject)
    const body = toText(email.body)
    const bodySnippet = body ? excerpt(body, 90) : null
    const line = subject || bodySnippet
    if (line) lines.push(`Email ${i + 1}: ${line}`)
  }
  if (lines.length > 0) return lines.join('\n\n')
  const fallbackName = toText(row.name)
  return fallbackName ? `Sequence: ${fallbackName}` : null
}

export function buildSocialMiniPreviewCode(rawCode: string): string {
  const code = rawCode.trim()
  if (!code) return code
  if (/\bexport\s+default\b/.test(code)) return code
  const stageWidth = 1280
  const stageHeight = 800
  const creativeWidth = 1080
  const creativeHeight = 1350
  const scale = Math.max(stageWidth / creativeWidth, stageHeight / creativeHeight)
  const offsetX = (stageWidth - creativeWidth * scale) / 2
  const offsetY = 0
  // Fixed colors live inside the isolated TSX mini preview, not product chrome.
  return `${code}
export default function VibeySocialRoot() {
  const Component = typeof SocialCreative !== 'undefined' ? SocialCreative : typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!Component) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa', fontSize: '12px' }}>
        No creative component found
      </div>
    )
  }
  return (
    <div data-vibey-social-root style={{ width: '${stageWidth}px', height: '${stageHeight}px', overflow: 'hidden', position: 'relative', background: '#18181b' }}>
      <div style={{ position: 'absolute', left: '${offsetX}px', top: '${offsetY}px', width: '${creativeWidth}px', height: '${creativeHeight}px', transform: 'scale(${scale})', transformOrigin: 'top left' }}>
        <Component width={${creativeWidth}} height={${creativeHeight}} />
      </div>
    </div>
  )
}`
}
