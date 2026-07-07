import type { Metadata } from 'next'
import { DocsChatWidget } from '@/components/docs-chat/DocsChatWidget'
import { ThemeProvider } from '@/components/ThemeProvider'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Documentation | Vibey',
  description: 'Vibey Documentation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background min-h-screen antialiased">
        <ThemeProvider>
          {children}
          <DocsChatWidget />
        </ThemeProvider>
      </body>
    </html>
  )
}
