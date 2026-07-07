import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'

export function FeaturePageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="relative min-h-screen pt-24">
        <div className="hero-dot-grid pointer-events-none fixed inset-0 z-0" />
        <div className="relative z-[1]">{children}</div>
      </main>
      <Footer />
    </>
  )
}
