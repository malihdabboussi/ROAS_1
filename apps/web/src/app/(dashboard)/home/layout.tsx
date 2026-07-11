'use client'

import { Space_Grotesk } from 'next/font/google'
import { HomeShell } from '@/features/home'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <HomeShell>
      <div className={`${spaceGrotesk.variable} flex h-full min-h-0 flex-1 flex-col`}>
        {children}
      </div>
    </HomeShell>
  )
}
