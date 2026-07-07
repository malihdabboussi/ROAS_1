import {
  Bot,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  MessageSquare,
  PenLine,
  Plug,
  Send,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export const CONTACT_SOURCE_CHANNELS = [
  'funnel',
  'form',
  'widget',
  'telegram',
  'import',
  'manual',
  'automation',
  'integration',
] as const

export type ContactSourceChannel = (typeof CONTACT_SOURCE_CHANNELS)[number]

export interface ContactSourceMeta {
  label: string
  icon: LucideIcon
  badgeClass: string
}

const META: Record<ContactSourceChannel, ContactSourceMeta> = {
  funnel: { label: 'Funnel', icon: Filter, badgeClass: 'badge-glass-blue' },
  form: { label: 'Form', icon: MessageSquare, badgeClass: 'badge-glass-purple' },
  widget: { label: 'Widget', icon: Bot, badgeClass: 'badge-glass-green' },
  telegram: { label: 'Telegram', icon: Send, badgeClass: 'badge-glass-blue' },
  import: { label: 'Import', icon: FileSpreadsheet, badgeClass: 'badge-glass-orange' },
  manual: { label: 'Manual', icon: PenLine, badgeClass: 'badge-glass-neutral' },
  automation: { label: 'Automation', icon: Workflow, badgeClass: 'badge-glass-purple' },
  integration: { label: 'Integration', icon: Plug, badgeClass: 'badge-glass-orange' },
}

const FALLBACK: ContactSourceMeta = {
  label: 'Unknown',
  icon: HelpCircle,
  badgeClass: 'badge-glass-neutral',
}

export function contactSourceMeta(channel: string | null | undefined): ContactSourceMeta {
  if (!channel) return FALLBACK
  return META[channel as ContactSourceChannel] ?? FALLBACK
}
