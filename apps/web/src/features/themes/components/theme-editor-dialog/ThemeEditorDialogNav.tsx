'use client'

import { THEME_EDITOR_NAV_ITEMS } from './theme-editor-dialog.constants'
import type { ThemeEditorNavTab } from './theme-editor-dialog.types'

export interface ThemeEditorDialogNavProps {
  activeTab: ThemeEditorNavTab
  setActiveTab: (tab: ThemeEditorNavTab) => void
}

export function ThemeEditorDialogMobileNav({ activeTab, setActiveTab }: ThemeEditorDialogNavProps) {
  return (
    <div className="px-spacing-2 py-spacing-2 flex-shrink-0 overflow-x-auto border-b border-[var(--color-border)] md:hidden">
      <div className="gap-spacing-1 flex">
        {THEME_EDITOR_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`gap-spacing-1 px-spacing-3 py-spacing-1 body-3 flex shrink-0 items-center whitespace-nowrap rounded-md border border-transparent transition-colors ${activeTab === item.id ? 'nav-glass-selected-purple nav-glass-text-purple font-medium' : 'text-[var(--color-muted-foreground)]'}`}
          >
            <item.icon className="h-3 w-3" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ThemeEditorDialogDesktopNav({
  activeTab,
  setActiveTab,
}: ThemeEditorDialogNavProps) {
  return (
    <div className="p-spacing-4 hidden w-48 flex-shrink-0 overflow-y-auto border-r border-[var(--color-border)] md:block">
      <nav className="space-y-spacing-1">
        {THEME_EDITOR_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`gap-spacing-2 px-spacing-3 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center border text-left transition-colors ${activeTab === item.id ? 'nav-glass-selected-purple nav-glass-text-purple font-medium' : 'border-transparent text-[var(--color-foreground)] hover:bg-[var(--color-hover-subtle)]'}`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
