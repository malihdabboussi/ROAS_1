import type { SocialPost } from '@/lib/artifacts'

export function pickCareer(d: Record<string, unknown>): string | undefined {
  for (const k of [
    'occupation',
    'career',
    'job_title',
    'role',
    'profession',
    'industry',
    'title',
  ]) {
    const v = d[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

export function pickAge(d: Record<string, unknown>): string | undefined {
  for (const k of ['age', 'age_range']) {
    const v = d[k]
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
  }
  return undefined
}

export function pickBg(pd: Record<string, unknown>): string | undefined {
  const toInlineText = (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const parts = value.map((v) => toInlineText(v)).filter((v): v is string => Boolean(v))
      if (parts.length > 0) return parts.join(' · ')
      return undefined
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      for (const key of ['summary', 'description', 'background', 'bio', 'text']) {
        const hit = toInlineText(obj[key])
        if (hit) return hit
      }
      for (const val of Object.values(obj)) {
        const hit = toInlineText(val)
        if (hit) return hit
      }
    }
    return undefined
  }
  const bg = toInlineText(pd.background_profile)
  if (bg) return bg
  const summary = toInlineText(pd.comprehensive_summary)
  if (summary) return summary
  return undefined
}

export function htmlEmailBodyToPreviewPlain(html: string, maxLen: number): string {
  let s = String(html ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|table|h[1-6]|li|blockquote|section|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  if (s.length <= maxLen) return s
  let cut = s.slice(0, maxLen)
  const lastNl = cut.lastIndexOf('\n')
  if (lastNl > maxLen * 0.55) cut = cut.slice(0, lastNl)
  else {
    const lastSp = cut.lastIndexOf(' ')
    if (lastSp > maxLen * 0.45) cut = cut.slice(0, lastSp)
  }
  return `${cut.trimEnd()}…`
}

export function blogContentToPlainText(content: unknown): string {
  const out: string[] = []
  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      const s = value.trim()
      if (s) out.push(s)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (!value || typeof value !== 'object') return
    const obj = value as Record<string, unknown>
    for (const key of ['text', 'title', 'subtitle', 'heading', 'content', 'description']) {
      walk(obj[key])
    }
    if (out.length === 0) {
      for (const nested of Object.values(obj)) walk(nested)
    }
  }
  walk(content)
  return out.join('\n')
}

export function resolveSocialPostVisual(p: SocialPost | null): {
  tsx: string | null
  image: string
  video: string
} {
  if (!p) {
    return { tsx: null, image: '', video: '' }
  }
  const tsxRoot = p.generated_tsx?.trim()
  if (tsxRoot) {
    return { tsx: tsxRoot, image: '', video: '' }
  }
  const slides = Array.isArray(p.carousel_slides) ? p.carousel_slides : []
  for (const s of slides) {
    const t = typeof s.tsx === 'string' ? s.tsx.trim() : ''
    if (t) {
      return { tsx: t, image: '', video: '' }
    }
  }
  const vRoot = p.video_url?.trim() || ''
  const iRoot = p.image_url?.trim() || ''
  if (vRoot) {
    return { tsx: null, image: '', video: vRoot }
  }
  if (iRoot) {
    return { tsx: null, image: iRoot, video: '' }
  }
  for (const s of slides) {
    const v = s.video_url?.trim()
    if (v) {
      return { tsx: null, image: '', video: v }
    }
  }
  for (const s of slides) {
    const i = s.image_url?.trim()
    if (i) {
      return { tsx: null, image: i, video: '' }
    }
  }
  return { tsx: null, image: '', video: '' }
}
