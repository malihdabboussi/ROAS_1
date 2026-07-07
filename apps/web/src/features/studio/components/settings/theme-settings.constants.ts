import type { ComponentType } from 'react'
import {
  Image as ImageIcon,
  Layout,
  MessageSquare,
  Palette,
  Share2,
  Sparkles,
  Type,
} from 'lucide-react'
import type { UserThemeColors } from '@/features/themes/types'
import type { ThemeNavTab } from './theme-settings.types'

export const DEFAULT_COLORS: UserThemeColors = {
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

export const THEME_TAB_ITEMS: {
  id: ThemeNavTab
  label: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
  { id: 'brand', label: 'Brand', icon: MessageSquare },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'design', label: 'Design', icon: Layout },
  { id: 'images', label: 'Images', icon: Sparkles },
]
