import type { LucideIcon } from 'lucide-react'
import {
  Image as ImageIcon,
  Layout,
  MessageSquare,
  Palette,
  Share2,
  Sparkles,
  Type,
} from 'lucide-react'
import type { UserThemeColors } from '../../types'
import type { ThemeEditorNavTab } from './theme-editor-dialog.types'

export const THEME_EDITOR_DEFAULT_COLORS: UserThemeColors = {
  primary: '#10B981',
  primaryForeground: '#000000',
  secondaryAccent1: '#7AF0FF',
  secondaryAccent2: '#120336',
  heading: '#161616',
  body: '#666666',
  pageBackground: '#FAF9F6',
  slideBackground: '#FAF9F6',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  input: '#F2F2F2',
  calloutInfo: '#3b82f6',
  calloutSuccess: '#22c55e',
  calloutWarning: '#f59e0b',
  calloutQuestion: '#10B981',
  calloutTip: '#06b6d4',
}

export const THEME_EDITOR_NAV_ITEMS: {
  id: ThemeEditorNavTab
  label: string
  icon: LucideIcon
}[] = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
  { id: 'brand', label: 'Brand Identity', icon: MessageSquare },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'design', label: 'Design', icon: Layout },
  { id: 'images', label: 'Images', icon: Sparkles },
]

export const THEME_EDITOR_SOCIAL_FIELDS = [
  { key: 'website', label: 'Website', placeholder: 'https://yourdomain.com' },
  { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
  { key: 'facebook', label: 'Facebook', placeholder: '@yourpage or URL' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: '/in/yourprofile or company URL' },
  { key: 'youtube', label: 'YouTube', placeholder: '@yourchannel or URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@yourhandle' },
  { key: 'pinterest', label: 'Pinterest', placeholder: '@yourhandle or URL' },
  { key: 'threads', label: 'Threads', placeholder: '@yourhandle' },
  { key: 'bluesky', label: 'Bluesky', placeholder: '@yourhandle.bsky.social' },
] as const
