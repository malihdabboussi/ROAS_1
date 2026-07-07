'use client'

import {
  Briefcase,
  FileText,
  Gift,
  Image as ImageIcon,
  Instagram,
  LayoutTemplate,
  ListTodo,
  Mail,
  Megaphone,
  MessagesSquare,
  Music2,
  User,
  Video,
  X,
  Youtube,
} from 'lucide-react'
import type { ArtifactNodeType, AttachedArtifact } from '@/lib/chat/attached-artifact'
export { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
export type { ArtifactNodeType, AttachedArtifact } from '@/lib/chat/attached-artifact'

export const ARTIFACT_GLASS: Record<ArtifactNodeType, string> = {
  offer: 'badge-glass badge-glass-purple',
  'offer-step': 'badge-glass badge-glass-purple',
  funnel: 'badge-glass badge-glass-blue',
  page: 'badge-glass badge-glass-blue',
  ad: 'badge-glass badge-glass-green',
  'ad-campaign': 'badge-glass badge-glass-green',
  'ad-set': 'badge-glass badge-glass-green',
  sequence: 'badge-glass badge-glass-orange',
  'sequence-email': 'badge-glass badge-glass-orange',
  email: 'badge-glass badge-glass-orange',
  presentation: 'badge-glass badge-glass-cyan',
  avatar: 'badge-glass badge-glass-muted',
  'social-post': 'badge-glass badge-glass-blue',
  'instagram-research': 'badge-glass badge-glass-purple',
  'tiktok-research': 'badge-glass badge-glass-muted',
  'youtube-research': 'badge-glass badge-glass-red',
  'twitter-research': 'badge-glass badge-glass-blue',
  'space-task': 'badge-glass badge-glass-green',
  'contact-conversation': 'badge-glass badge-glass-purple',
  space_doc: 'badge-glass badge-glass-muted',
  document: 'badge-glass badge-glass-muted',
  'media-image': 'badge-glass badge-glass-cyan',
  'media-video': 'badge-glass badge-glass-blue',
}

export const ARTIFACT_ICON: Record<ArtifactNodeType, React.ReactNode> = {
  offer: <Briefcase className="h-3.5 w-3.5 shrink-0" />,
  'offer-step': <Briefcase className="h-3.5 w-3.5 shrink-0" />,
  funnel: <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />,
  page: <FileText className="h-3.5 w-3.5 shrink-0" />,
  ad: <Megaphone className="h-3.5 w-3.5 shrink-0" />,
  'ad-campaign': <Megaphone className="h-3.5 w-3.5 shrink-0" />,
  'ad-set': <Megaphone className="h-3.5 w-3.5 shrink-0" />,
  sequence: <Mail className="h-3.5 w-3.5 shrink-0" />,
  'sequence-email': <FileText className="h-3.5 w-3.5 shrink-0" />,
  email: <Mail className="h-3.5 w-3.5 shrink-0" />,
  presentation: <Gift className="h-3.5 w-3.5 shrink-0" />,
  avatar: <User className="h-3.5 w-3.5 shrink-0" />,
  'social-post': <ImageIcon className="h-3.5 w-3.5 shrink-0" />,
  'instagram-research': <Instagram className="h-3.5 w-3.5 shrink-0" />,
  'tiktok-research': <Music2 className="h-3.5 w-3.5 shrink-0" />,
  'youtube-research': <Youtube className="h-3.5 w-3.5 shrink-0" />,
  'twitter-research': <X className="h-3.5 w-3.5 shrink-0" />,
  'space-task': <ListTodo className="h-3.5 w-3.5 shrink-0" />,
  'contact-conversation': <MessagesSquare className="h-3.5 w-3.5 shrink-0" />,
  space_doc: <FileText className="h-3.5 w-3.5 shrink-0" />,
  document: <FileText className="h-3.5 w-3.5 shrink-0" />,
  'media-image': <ImageIcon className="h-3.5 w-3.5 shrink-0" />,
  'media-video': <Video className="h-3.5 w-3.5 shrink-0" />,
}

interface ArtifactAttachmentsProps {
  artifacts: AttachedArtifact[]
  onRemove: (id: string) => void
  /** Padding row above textarea (defaults match legacy chat chrome). */
  chipRowClassName?: string
}

export function ArtifactAttachments({
  artifacts,
  onRemove,
  chipRowClassName,
}: ArtifactAttachmentsProps) {
  if (artifacts.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${chipRowClassName ?? 'px-4 pb-2'}`}>
      {artifacts.map((a) => (
        <div
          key={a.id}
          className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm ${ARTIFACT_GLASS[a.type] ?? 'badge-glass badge-glass-muted'}`}
        >
          {ARTIFACT_ICON[a.type]}
          <span className="max-w-[140px] truncate" title={a.label}>
            {a.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Remove ${a.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
