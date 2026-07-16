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
  title: 'ROAS',
  description: 'Your AI Marketing Agency',
  icons: {
    icon: [
      { url: '/Logos/roas/icon-white.png', media: '(prefers-color-scheme: dark)' },
      { url: '/Logos/roas/icon-black.png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
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
