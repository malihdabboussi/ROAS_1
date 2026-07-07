import {
  Briefcase,
  FileText,
  Film,
  Gift,
  Image as ImageIcon,
  LayoutTemplate,
  Mail,
  Megaphone,
  Paperclip,
  User,
  type LucideIcon,
} from 'lucide-react'

export const DELIVERABLE_TYPE_LABEL: Record<string, string> = {
  doc: 'Document',
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  file: 'File',
  offer: 'Offer',
  funnel: 'Funnel',
  form: 'Form',
  task: 'Task',
  mission: 'Mission',
  flow: 'Flow',
  presentation: 'Presentation',
  sequence: 'Sequence',
  blog_post: 'Blog Post',
  social_post: 'Social Post',
  ad: 'Ad',
  ad_set: 'Ad Set',
  ad_campaign: 'Ad Campaign',
  avatar: 'Avatar',
  website: 'Website',
  theme: 'Theme',
  custom_object: 'Object',
  visual_doc: 'Visual Doc',
}

export const DELIVERABLE_TYPE_BADGE: Record<string, string> = {
  doc: 'badge-glass badge-glass-blue',
  text: 'badge-glass badge-glass-muted',
  image: 'badge-glass badge-glass-purple',
  video: 'badge-glass badge-glass-orange',
  audio: 'badge-glass badge-glass-blue',
  pdf: 'badge-glass badge-glass-red',
  file: 'badge-glass badge-glass-muted',
  offer: 'badge-glass badge-glass-green',
  funnel: 'badge-glass badge-glass-blue',
  form: 'badge-glass badge-glass-blue',
  task: 'badge-glass badge-glass-green',
  mission: 'badge-glass badge-glass-green',
  flow: 'badge-glass badge-glass-blue',
  presentation: 'badge-glass badge-glass-purple',
  sequence: 'badge-glass badge-glass-orange',
  blog_post: 'badge-glass badge-glass-blue',
  social_post: 'badge-glass badge-glass-purple',
  ad: 'badge-glass badge-glass-orange',
  ad_set: 'badge-glass badge-glass-orange',
  ad_campaign: 'badge-glass badge-glass-orange',
  avatar: 'badge-glass badge-glass-green',
  website: 'badge-glass badge-glass-blue',
  theme: 'badge-glass badge-glass-purple',
  custom_object: 'badge-glass badge-glass-muted',
  visual_doc: 'badge-glass badge-glass-blue',
}

export const DELIVERABLE_ICONS: Record<string, LucideIcon> = {
  doc: FileText,
  text: FileText,
  pdf: FileText,
  image: ImageIcon,
  video: Film,
  audio: Film,
  file: Paperclip,
  offer: Briefcase,
  funnel: LayoutTemplate,
  form: FileText,
  task: FileText,
  mission: Briefcase,
  flow: LayoutTemplate,
  presentation: Gift,
  sequence: Mail,
  blog_post: FileText,
  social_post: ImageIcon,
  ad: Megaphone,
  ad_set: Megaphone,
  ad_campaign: Megaphone,
  avatar: User,
  website: LayoutTemplate,
  theme: ImageIcon,
  custom_object: FileText,
  visual_doc: FileText,
}

export function DeliverableIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const Icon = DELIVERABLE_ICONS[type] || Paperclip
  const sizeClass = size === 'md' ? 'icon-md' : 'icon-sm'
  return <Icon className={`${sizeClass} text-muted-foreground`} />
}

export function DeliverableTypeIconBadge({ type }: { type: string }) {
  return <DeliverableIcon type={type} size="sm" />
}
