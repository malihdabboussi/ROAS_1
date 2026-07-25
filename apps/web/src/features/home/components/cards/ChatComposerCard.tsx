'use client'

import { useState } from 'react'
import { HomeDashboardV4Composer } from '@/components/home-dashboard-v4/HomeDashboardV4Composer'
import type { HomeDashboardTemplateId } from '@/features/home/config/home-dashboard-v4.config'

export function ChatComposerCard() {
  const [selectedTemplate, setSelectedTemplate] = useState<HomeDashboardTemplateId | null>(null)

  return (
    <section className="section-card card-elevated px-spacing-4 py-spacing-4">
      <h2 className="body-1 text-foreground mb-spacing-3 font-semibold">Ask ROAS</h2>
      <HomeDashboardV4Composer
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
      />
    </section>
  )
}
