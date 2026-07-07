import type { ChannelMention } from '@/lib/channels/channel-types'
import type { ActivityMention } from '../services/spaces.service'

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
  }
  return map[ext] ?? 'application/octet-stream'
}

export function mapComposerMentions(mentions: ChannelMention[]): ActivityMention[] {
  return mentions.map((m) => ({
    type: m.type,
    user_id: m.user_id,
    agent_key: m.agent_key,
    entity_id: m.entity_id,
    label: m.label,
  }))
}

export function mapComposerAttachments(urls: string[]) {
  return urls.map((url) => {
    let filename = 'attachment'
    try {
      const path = new URL(url).pathname.split('/').pop()
      if (path) filename = decodeURIComponent(path)
    } catch {
      /* keep default */
    }
    const ext = filename.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
    const mimeType = mimeFromExt(ext)
    return { filename, mimeType, fileUrl: url }
  })
}
