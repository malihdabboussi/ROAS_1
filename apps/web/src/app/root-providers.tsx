'use client'

import { ThemeProvider } from 'next-themes'
import { SettingsModalProvider } from '@/features/settings/containers/SettingsModalProvider'
import { ClientObservabilityProvider } from '@/lib/observability/client-observability-provider'
import { ThemedToaster } from './themed-toaster'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ClientObservabilityProvider />
      <SettingsModalProvider>{children}</SettingsModalProvider>
      <ThemedToaster />
    </ThemeProvider>
  )
}
