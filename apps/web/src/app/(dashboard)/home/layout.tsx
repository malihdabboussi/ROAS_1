import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { HomeShell } from '@/features/home'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// Server layout so `/home` (a client page) still gets a proper <title>; nested
// segments (meetings, inbox, channels…) override it with their own metadata.
export const metadata: Metadata = { title: 'Home | ROAS' }

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <HomeShell>
      <div className={`${spaceGrotesk.variable} flex h-full min-h-0 flex-1 flex-col`}>
        {children}
      </div>
    </HomeShell>
  )
}
