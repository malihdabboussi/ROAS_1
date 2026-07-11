'use client'

import { ThemeProvider } from 'next-themes'
import { SettingsModalProvider } from '@/features/settings/containers/SettingsModalProvider'
import { ClientObservabilityProvider } from '@/lib/observability/client-observability-provider'
import { APP_THEME_STORAGE_KEY } from '@/lib/theme/app-theme'
import { ThemedToaster } from './themed-toaster'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey={APP_THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <ClientObservabilityProvider />
      <SettingsModalProvider>{children}</SettingsModalProvider>
      <ThemedToaster />
    </ThemeProvider>
  )
}
