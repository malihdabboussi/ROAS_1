import type { Metadata } from 'next'
import Script from 'next/script'
import { ClientObservabilityProvider } from '@/lib/observability/client-observability-provider'
import { TAILWIND_BROWSER_SCRIPT_SRC } from '@/lib/tailwind-browser'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROAS',
  description: 'Powered by ROAS',
  icons: {
    icon: '/Logos/logov2/icon-white.png',
    apple: '/Logos/logov2/icon-white.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body>
        <Script
          id="vibey-tailwind-play-cdn"
          src={TAILWIND_BROWSER_SCRIPT_SRC}
          strategy="beforeInteractive"
          data-vibey-tailwind-play-cdn="true"
        />
        <ClientObservabilityProvider />
        {children}
      </body>
    </html>
  )
}
