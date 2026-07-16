'use client'

import type { ReactNode } from 'react'
import {
  Briefcase,
  FileText,
  Gift,
  Image as ImageIcon,
  LayoutTemplate,
  Mail,
  Megaphone,
  User,
} from 'lucide-react'
import type { ArtifactNodeType } from '@/lib/chat/attached-artifact'
import type { ArtifactPreviewType } from './artifact-inline-preview.types'

export const ICON_MAP: Record<ArtifactPreviewType, ReactNode> = {
  offer: <Briefcase className="icon-sm shrink-0" aria-hidden />,
  funnel: <LayoutTemplate className="icon-sm shrink-0" aria-hidden />,
  avatar: <User className="icon-sm shrink-0" aria-hidden />,
  sequence: <Mail className="icon-sm shrink-0" aria-hidden />,
  email: <Mail className="icon-sm shrink-0" aria-hidden />,
  'visual-doc': <FileText className="icon-sm shrink-0" aria-hidden />,
  presentation: <Gift className="icon-sm shrink-0" aria-hidden />,
  ad: <Megaphone className="icon-sm shrink-0" aria-hidden />,
  'ad-set': <Megaphone className="icon-sm shrink-0" aria-hidden />,
  'ad-campaign': <Megaphone className="icon-sm shrink-0" aria-hidden />,
  'social-post': <ImageIcon className="icon-sm shrink-0" aria-hidden />,
  'blog-post': <FileText className="icon-sm shrink-0" aria-hidden />,
  form: <FileText className="icon-sm shrink-0" aria-hidden />,
  task: <FileText className="icon-sm shrink-0" aria-hidden />,
  mission: <Briefcase className="icon-sm shrink-0" aria-hidden />,
  flow: <LayoutTemplate className="icon-sm shrink-0" aria-hidden />,
  website: <LayoutTemplate className="icon-sm shrink-0" aria-hidden />,
  theme: <ImageIcon className="icon-sm shrink-0" aria-hidden />,
  'custom-object': <FileText className="icon-sm shrink-0" aria-hidden />,
}

export const LABEL_MAP: Record<ArtifactPreviewType, string> = {
  offer: 'Offer',
  funnel: 'Funnel',
  avatar: 'Avatar',
  sequence: 'Sequence',
  email: 'Email',
  'visual-doc': 'Visual Doc',
  presentation: 'Presentation',
  ad: 'Ad',
  'ad-set': 'Ad Set',
  'ad-campaign': 'Ad Campaign',
  'social-post': 'Social Post',
  'blog-post': 'Blog Post',
  form: 'Form',
  task: 'Task',
  mission: 'Mission',
  flow: 'Flow',
  website: 'Website',
  theme: 'Theme',
  'custom-object': 'Object',
}

export function artifactTypeToNodeType(t: ArtifactPreviewType): ArtifactNodeType {
  if (t === 'social-post') return 'document'
  if (t === 'blog-post') return 'document'
  if (t === 'email') return 'document'
  if (t === 'visual-doc') return 'document'
  if (t === 'form') return 'document'
  if (t === 'task') return 'space-task'
  if (t === 'mission') return 'document'
  if (t === 'flow') return 'document'
  if (t === 'website') return 'funnel'
  if (t === 'theme') return 'document'
  if (t === 'custom-object') return 'document'
  return t as ArtifactNodeType
}

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
  notification: 'badge-glass badge-glass-purple',
  'contact-conversation': 'badge-glass badge-glass-purple',
  space_doc: 'badge-glass badge-glass-muted',
  document: 'badge-glass badge-glass-muted',
  'media-image': 'badge-glass badge-glass-cyan',
  'media-video': 'badge-glass badge-glass-blue',
}

/** Mobile: `.artifact-inline-chat-shell` overrides radius/border in globals; glass from literal `card-glass` (not `md:card-glass` — that is not a Tailwind utility). */
export const ARTIFACT_INLINE_SHELL_400 =
  'artifact-inline-chat-shell card-glass w-full overflow-hidden text-left transition-all md:rounded-spacing-3 md:hover:bg-hover-subtle md:my-spacing-2 md:max-w-[400px]'
export const ARTIFACT_INLINE_SHELL_420 =
  'artifact-inline-chat-shell card-glass w-full overflow-hidden text-left transition-all md:rounded-spacing-3 md:hover:bg-hover-subtle md:my-spacing-2 md:max-w-[420px]'
export const ARTIFACT_INLINE_SHELL_440 =
  'artifact-inline-chat-shell card-glass w-full overflow-hidden text-left transition-all md:rounded-spacing-3 md:hover:bg-hover-subtle md:my-spacing-2 md:max-w-[440px]'
