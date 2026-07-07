'use client'

import { THEME_TAB_ITEMS } from './theme-settings.constants'
import type { ThemeNavTab } from './theme-settings.types'

export interface ThemeSettingsInlineTabBarProps {
  activeTab: ThemeNavTab
  onTabChange?: (tab: ThemeNavTab) => void
}

export function ThemeSettingsInlineTabBar({
  activeTab,
  onTabChange,
}: ThemeSettingsInlineTabBarProps) {
  return (
    <div className="border-border flex flex-wrap gap-1 border-b pb-2">
      {THEME_TAB_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange?.(item.id)}
            className={`gap-spacing-1 px-spacing-2 py-spacing-1.5 body-3 flex items-center rounded-md transition-colors ${
              isActive
                ? 'nav-glass-selected-purple nav-glass-text-purple font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
