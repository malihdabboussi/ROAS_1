'use client'

import type { ReactNode } from 'react'
import {
  Bot,
  Filter,
  Globe,
  Image as ImageIcon,
  Layout,
  Megaphone,
  MessageSquare,
  Palette,
  Share2,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react'
import type { ThemeNavTab } from '../../settings'
import type { SettingsSection } from './settings-tab.types'

type NavItem = {
  id: SettingsSection
  label: string
  icon: ReactNode
}

type ThemeSubItem = {
  id: ThemeNavTab
  label: string
  icon: ReactNode
}

const THEME_SUB_ITEMS: ThemeSubItem[] = [
  { id: 'colors', label: 'Colors', icon: <Palette className="h-3.5 w-3.5" /> },
  { id: 'fonts', label: 'Fonts', icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'logo', label: 'Logo', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'brand', label: 'Brand', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'social', label: 'Social', icon: <Share2 className="h-3.5 w-3.5" /> },
  { id: 'design', label: 'Design', icon: <Layout className="h-3.5 w-3.5" /> },
  { id: 'images', label: 'Images', icon: <Sparkles className="h-3.5 w-3.5" /> },
]

export function SettingsTabNavigation({
  mobileMode,
  activeSection,
  onSectionChange,
  themeTab,
  onThemeTabChange,
  presentationsCount,
  websitesCount,
  settingsLoading,
}: {
  mobileMode?: boolean
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
  themeTab: ThemeNavTab
  onThemeTabChange: (tab: ThemeNavTab) => void
  presentationsCount: number
  websitesCount: number
  settingsLoading: boolean
}) {
  const navItems: NavItem[] = [
    { id: 'agent', label: 'Agent', icon: <Bot className="icon-sm" /> },
    { id: 'theme', label: 'Theme', icon: <Palette className="icon-sm" /> },
    { id: 'funnel', label: 'Funnel', icon: <Filter className="icon-sm" /> },
    { id: 'ads', label: 'Ads', icon: <Megaphone className="icon-sm" /> },
    ...(presentationsCount > 1
      ? [
          {
            id: 'presentation' as const,
            label: 'Presentation',
            icon: <Globe className="icon-sm" />,
          },
        ]
      : []),
    ...(websitesCount > 0
      ? [
          {
            id: 'website' as const,
            label: 'Website',
            icon: <Layout className="icon-sm" />,
          },
        ]
      : []),
    {
      id: 'danger',
      label: 'Danger Zone',
      icon: <Trash2 className="icon-sm text-destructive" />,
    },
  ]
  const skeletonNavCount = settingsLoading ? 2 : 0

  if (mobileMode) {
    return (
      <div className="flex items-center justify-center gap-1 px-3 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex items-center transition-all duration-500 ease-in-out ${
              activeSection === item.id
                ? 'chip-glass-blue px-spacing-3'
                : 'chip-glass-neutral px-spacing-2'
            }`}
          >
            {item.icon}
            {activeSection === item.id && (
              <span className="body-2 whitespace-nowrap font-semibold">{item.label}</span>
            )}
          </button>
        ))}
        {Array.from({ length: skeletonNavCount }).map((_, index) => (
          <div
            key={`skel-${index}`}
            aria-hidden="true"
            className="chip-glass-neutral h-spacing-8 rounded-spacing-3 w-8 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="w-48 flex-shrink-0 border-r border-border p-4">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`body-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium transition-all ${
                activeSection === item.id
                  ? 'nav-glass-selected-purple nav-glass-text-purple'
                  : 'nav-glass-hover-purple text-muted-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
            {item.id === 'theme' && activeSection === 'theme' && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-2">
                {THEME_SUB_ITEMS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onThemeTabChange(sub.id)}
                    className={`typo-caption flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-medium transition-all ${
                      themeTab === sub.id
                        ? 'nav-glass-selected-purple nav-glass-text-purple'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sub.icon}
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: skeletonNavCount }).map((_, index) => (
          <div
            key={`skel-${index}`}
            aria-hidden="true"
            className="h-9 animate-pulse rounded-lg bg-muted/30 px-3 py-2"
          />
        ))}
      </nav>
    </div>
  )
}
