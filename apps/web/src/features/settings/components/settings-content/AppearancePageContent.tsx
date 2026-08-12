'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { cn } from '@/lib/utils/cn'

export default function AppearancePageContent() {
  const { theme, setTheme } = useTheme()
  const menuStyle = useShellMenuDock((state) => state.menuStyle)
  const setMenuStyle = useShellMenuDock((state) => state.setMenuStyle)

  return (
    <div className="sm:p-spacing-4 md:p-spacing-8 p-2">
      <div className="section-card p-spacing-4 sm:p-spacing-6 max-w-2xl">
        <div className="border-border rounded-spacing-2 p-spacing-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="body-1 font-medium">Appearance</h3>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Choose your preferred theme
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-icon-glass"
            >
              {theme === 'dark' ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
            </button>
          </div>
        </div>
        <div className="border-border rounded-spacing-2 p-spacing-6 mt-spacing-4 border">
          <div>
            <h3 className="body-1 text-foreground font-medium">Menu style</h3>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Choose a chat-first sidebar or the full workspace rail.
            </p>
          </div>
          <div className="gap-spacing-2 mt-spacing-4 grid grid-cols-2">
            {(['simple', 'advanced'] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={menuStyle === style}
                onClick={() => setMenuStyle(style)}
                className={cn(
                  'rounded-spacing-2 border-border p-spacing-3 body-2 text-left border transition-colors',
                  menuStyle === style
                    ? 'nav-glass-selected-purple nav-glass-text-purple'
                    : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                )}
              >
                <span className="block font-medium">
                  {style === 'simple' ? 'Simple' : 'Advanced'}
                </span>
                <span className="body-4 mt-spacing-1 block">
                  {style === 'simple' ? 'Navigation, favorites, and chats' : 'Movable workspace rail'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
