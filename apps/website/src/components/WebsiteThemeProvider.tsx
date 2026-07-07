'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'vibey-site-theme'

export function WebsiteThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const pitchLock = pathname != null && pathname.startsWith('/vibey-pitch')

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      forcedTheme={pitchLock ? 'dark' : undefined}
      disableTransitionOnChange
      enableColorScheme={false}
    >
      {children}
    </ThemeProvider>
  )
}
