'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export default function AppearancePageContent() {
  const { theme, setTheme } = useTheme()

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
      </div>
    </div>
  )
}
