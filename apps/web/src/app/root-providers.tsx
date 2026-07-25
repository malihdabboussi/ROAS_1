'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { SettingsModalProvider } from '@/features/settings/containers/SettingsModalProvider'
import { ClientObservabilityProvider } from '@/lib/observability/client-observability-provider'
import { APP_THEME_STORAGE_KEY } from '@/lib/theme/app-theme'
import { ThemedToaster } from './themed-toaster'

const SCROLLBAR_IDLE_MS = 700

function TransientScrollbarController() {
  useEffect(() => {
    const root = document.documentElement
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    root.dataset.transientScrollbars = 'true'

    const handleScroll = () => {
      root.dataset.scrolling = 'true'
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        idleTimer = null
        delete root.dataset.scrolling
      }, SCROLLBAR_IDLE_MS)
    }

    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('scroll', handleScroll, true)
      if (idleTimer) clearTimeout(idleTimer)
      delete root.dataset.scrolling
      delete root.dataset.transientScrollbars
    }
  }, [])

  return null
}

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey={APP_THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <TransientScrollbarController />
      <ClientObservabilityProvider />
      <SettingsModalProvider>{children}</SettingsModalProvider>
      <ThemedToaster />
    </ThemeProvider>
  )
}
