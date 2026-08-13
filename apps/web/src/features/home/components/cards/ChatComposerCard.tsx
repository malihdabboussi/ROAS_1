'use client'

import { HomeDashboardV4Composer } from '@/components/home-dashboard-v4/HomeDashboardV4Composer'

export function ChatComposerCard() {
  return (
    <section className="section-card card-elevated px-spacing-4 py-spacing-4">
      <h2 className="body-1 text-foreground mb-spacing-3 font-semibold">Ask Pixel</h2>
      <HomeDashboardV4Composer />
    </section>
  )
}
