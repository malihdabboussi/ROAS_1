import { buildOfferStepPreviews } from '@/lib/artifacts'

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
  return `${code}
export default function VibeySocialRoot() {
  const Component = typeof SocialCreative !== 'undefined' ? SocialCreative : typeof AdCreative !== 'undefined' ? AdCreative : null
  if (!Component) return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa', fontSize: '12px' }}>No creative</div>
  return (
    <div style={{ width: '${stageWidth}px', height: '${stageHeight}px', overflow: 'hidden', position: 'relative', background: '#18181b' }}>
      <div style={{ position: 'absolute', left: '${offsetX}px', top: '0px', width: '${creativeWidth}px', height: '${creativeHeight}px', transform: 'scale(${scale})', transformOrigin: 'top left' }}>
        <Component width={${creativeWidth}} height={${creativeHeight}} />
      </div>
    </div>
  )
}`
}

export function buildOfferTextPreview(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const steps = buildOfferStepPreviews(row)
  if (steps.length > 0) return steps.map((s) => `${s.label}: ${s.preview}`).join('\n\n')
  const data = row as Record<string, unknown>
  const parts: string[] = []
  for (let i = 1; i <= 6; i++) {
    const step = data[`step${i}_data`]
    if (step && typeof step === 'object') {
      const txt = JSON.stringify(step).replace(/[{}"]/g, ' ').trim().slice(0, 80)
      if (txt) parts.push(txt)
    }
    if (parts.length >= 4) break
  }
  return parts.length > 0 ? parts.join('\n') : null
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
    const subject = typeof email.subject === 'string' ? email.subject : null
    if (subject) lines.push(`Email ${i + 1}: ${subject}`)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

export function buildAvatarTextPreview(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const p =
    row.persona_data && typeof row.persona_data === 'object'
      ? (row.persona_data as Record<string, unknown>)
      : null
  if (!p) return null
  const d =
    p.demographics && typeof p.demographics === 'object'
      ? (p.demographics as Record<string, unknown>)
      : null
  const parts: string[] = []
  const career =
    typeof d?.occupation === 'string'
      ? d.occupation
      : typeof p.occupation === 'string'
        ? p.occupation
        : null
  const summary =
    typeof p.comprehensive_summary === 'string'
      ? p.comprehensive_summary
      : typeof p.background_profile === 'string'
        ? p.background_profile
        : null
  if (career) parts.push(`Career: ${career}`)
  if (summary) parts.push(summary.slice(0, 200))
  return parts.length > 0 ? parts.join('\n\n') : null
}
