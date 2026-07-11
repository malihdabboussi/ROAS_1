import type { Metadata } from 'next'
import { Inter, MuseoModerno } from 'next/font/google'
import { AppThemeBootScript } from '@/components/AppThemeBootScript'
import { BrainImportJobNotifier } from '@/features/brain/components/BrainImportJobNotifier'
import { RootProviders } from './root-providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const fontSiteHeadline = MuseoModerno({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-site-headline',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vibey',
  description: 'Your AI Marketing Agency',
  icons: {
    icon: [
      { url: '/Logos/logov2/icon-white.png', media: '(prefers-color-scheme: dark)' },
      { url: '/Logos/logov2/icon-black.png', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/Logos/logov2/icon-white.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fontSiteHeadline.variable}`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppThemeBootScript />
        <RootProviders>{children}</RootProviders>
        <BrainImportJobNotifier />
      </body>
    </html>
  )
}
