import type { SkDomain, SkSource, SkSourceType } from '../../services/sk.service'
import type { FathomMeeting, FirefliesTranscript } from '../../services/user-brain-import.service'
import type { LinkDetection, LinkPlatform, StagedItem, StagedPayload } from './types'

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeUrl(input: string): string {
  try {
    const url = new URL(input.trim())
    url.hash = ''
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return `${url.origin}${url.pathname}${url.search}`.toLowerCase()
  } catch {
    return input.trim().toLowerCase()
  }
}

export function detectLinkType(url: string): LinkDetection {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { supported: true, platform: 'YouTube', sourceType: 'transcript' }
  }
  if (lower.includes('instagram.com')) {
    return { supported: true, platform: 'Instagram', sourceType: 'article' }
  }
  if (lower.includes('tiktok.com')) {
    return { supported: true, platform: 'TikTok', sourceType: 'transcript' }
  }
  if (lower.includes('linkedin.com')) {
    return { supported: true, platform: 'LinkedIn', sourceType: 'article' }
  }
  if (lower.includes('facebook.com')) {
    return { supported: true, platform: 'Facebook', sourceType: 'article' }
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return { supported: false, platform: 'X/Twitter', sourceType: 'article' }
  }
  if (lower.match(/^https?:\/\//)) {
    return { supported: true, platform: 'Web', sourceType: 'website' }
  }
  return { supported: false, sourceType: 'website' }
}

function platformDomain(platform: LinkPlatform | undefined): SkDomain {
  if (platform === 'Instagram' || platform === 'LinkedIn' || platform === 'Facebook') {
    return 'marketing'
  }
  return 'general'
}

export function smartDefaults(payload: StagedPayload): {
  sourceType: SkSourceType
  domain: SkDomain
} {
  switch (payload.kind) {
    case 'text':
      return { sourceType: 'notes', domain: 'general' }
    case 'link': {
      const detection = payload.detection
      return {
        sourceType: detection?.sourceType ?? 'website',
        domain: platformDomain(detection?.platform),
      }
    }
    case 'file': {
      switch (payload.mediaKind) {
        case 'pdf':
        case 'document':
          return { sourceType: 'manual', domain: 'general' }
        case 'audio':
        case 'video':
          return { sourceType: 'transcript', domain: 'general' }
        case 'image':
          return { sourceType: 'notes', domain: 'general' }
        default:
          return { sourceType: 'notes', domain: 'general' }
      }
    }
    case 'media-asset': {
      const mime = payload.asset.mime_type || ''
      if (mime === 'application/pdf') return { sourceType: 'manual', domain: 'general' }
      if (mime.startsWith('image/')) return { sourceType: 'notes', domain: 'general' }
      if (mime.startsWith('audio/') || mime.startsWith('video/')) {
        return { sourceType: 'transcript', domain: 'general' }
      }
      return { sourceType: 'notes', domain: 'general' }
    }
    case 'fathom':
      return { sourceType: 'transcript', domain: 'operations' }
    case 'fireflies':
      return { sourceType: 'transcript', domain: 'operations' }
  }
}

export function makeSignature(payload: StagedPayload): string {
  switch (payload.kind) {
    case 'text':
      return `text::${payload.title.trim().toLowerCase()}::${payload.body.slice(0, 96).trim().toLowerCase()}`
    case 'link':
      return `link::${normalizeUrl(payload.url)}`
    case 'file':
      return `file::${payload.file.name.toLowerCase()}::${payload.file.size}`
    case 'media-asset':
      return `media::${payload.asset.id}`
    case 'fathom': {
      const meeting = payload.meeting
      return `fathom::${meeting.id || meeting.recording_id || meeting.call_id || meeting.url || meeting.title}`
    }
    case 'fireflies':
      return `fireflies::${payload.transcript.id}`
  }
}

export function fathomLikelyAlreadyIngested(meeting: FathomMeeting, sources: SkSource[]): boolean {
  const sigCandidates = [meeting.id, meeting.recording_id, meeting.call_id, meeting.url].filter(
    Boolean,
  ) as string[]
  if (sigCandidates.length === 0) return false
  return sources.some((source) => {
    const meta = source.metadata ?? {}
    return Object.values(meta).some((value) =>
      typeof value === 'string' ? sigCandidates.includes(value) : false,
    )
  })
}

export function firefliesLikelyAlreadyIngested(
  transcript: FirefliesTranscript,
  sources: SkSource[],
): boolean {
  return sources.some((source) => {
    const meta = source.metadata ?? {}
    return Object.values(meta).some((value) =>
      typeof value === 'string' ? value === transcript.id : false,
    )
  })
}

export function linkLikelyAlreadyIngested(url: string, sources: SkSource[]): boolean {
  const target = normalizeUrl(url)
  return sources.some((source) => (source.url ? normalizeUrl(source.url) === target : false))
}

export function refreshStagedWarnings(items: StagedItem[], sources: SkSource[]): StagedItem[] {
  const counts = new Map<string, number>()
  items.forEach((item) => counts.set(item.signature, (counts.get(item.signature) ?? 0) + 1))
  let changed = false
  const next = items.map((item) => {
    const duplicateInBatch = (counts.get(item.signature) ?? 0) > 1
    let alreadyInBrain = false
    if (item.payload.kind === 'link') {
      alreadyInBrain = linkLikelyAlreadyIngested(item.payload.url, sources)
    } else if (item.payload.kind === 'fathom') {
      alreadyInBrain = fathomLikelyAlreadyIngested(item.payload.meeting, sources)
    } else if (item.payload.kind === 'fireflies') {
      alreadyInBrain = firefliesLikelyAlreadyIngested(item.payload.transcript, sources)
    }
    if (
      item.warnings.duplicateInBatch === duplicateInBatch &&
      item.warnings.alreadyInBrain === alreadyInBrain
    ) {
      return item
    }
    changed = true
    return {
      ...item,
      warnings: { duplicateInBatch, alreadyInBrain },
    }
  })
  return changed ? next : items
}

export function buildDraftPreview(payload: StagedPayload): { title: string; subtitle?: string } {
  switch (payload.kind) {
    case 'text':
      return {
        title: payload.title.trim() || 'Untitled note',
        subtitle: payload.body.slice(0, 64).trim(),
      }
    case 'link': {
      const detection = payload.detection
      const cleaned = payload.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)
      return { title: cleaned, subtitle: detection?.platform ?? 'Link' }
    }
    case 'file':
      return {
        title: payload.file.name,
        subtitle: `${payload.mediaKind.toUpperCase()} · ${formatBytes(payload.file.size)}`,
      }
    case 'media-asset':
      return { title: payload.asset.name, subtitle: payload.asset.mime_type || 'Media' }
    case 'fathom':
      return {
        title: payload.meeting.title || payload.meeting.meeting_title || 'Untitled Fathom call',
        subtitle: formatMeetingTime(payload.meeting.created_at),
      }
    case 'fireflies':
      return {
        title: payload.transcript.title || 'Untitled Fireflies call',
        subtitle: formatMeetingTime(payload.transcript.date),
      }
  }
}

export function formatMeetingTime(iso?: string | number): string {
  if (!iso) return 'Unknown time'
  const date = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
