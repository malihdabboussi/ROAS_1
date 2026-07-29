import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Admin | ROAS',
  description: 'ROAS Admin Dashboard',
  icons: {
    icon: '/Logos/logov2_transperent.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
