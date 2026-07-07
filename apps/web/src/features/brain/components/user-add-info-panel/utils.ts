export function detectLinkType(url: string): {
  supported: boolean
  platform?: string
} {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return { supported: true, platform: 'YouTube' }
  if (lower.includes('instagram.com')) return { supported: true, platform: 'Instagram' }
  if (lower.includes('tiktok.com')) return { supported: true, platform: 'TikTok' }
  if (lower.includes('linkedin.com')) return { supported: true, platform: 'LinkedIn' }
  if (lower.includes('facebook.com')) return { supported: true, platform: 'Facebook' }
  if (lower.includes('twitter.com') || lower.includes('x.com'))
    return { supported: false, platform: 'X/Twitter' }
  if (lower.match(/^https?:\/\//)) return { supported: true, platform: 'Web' }
  return { supported: false }
}

export function formatMeetingTime(iso?: string | number): string {
  if (!iso) return 'Unknown time'
  const date = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

export function insertAtPosition(base: string, position: number, text: string): string {
  if (!text) return base

  const pos = Math.min(Math.max(0, position), base.length)
  const before = base.slice(0, pos)
  const after = base.slice(pos)
  const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)
  const spacer = needsSpace ? ' ' : ''
  return `${before}${spacer}${text}${after}`
}
