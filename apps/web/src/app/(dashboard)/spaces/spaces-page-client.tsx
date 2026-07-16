'use client'

import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { SpacesContainer } from '@/features/spaces'

export default function SpacesPageClient() {
  return (
    <main className="flex h-full min-h-0 flex-col">
      <MobilePageHeader title="Spaces" />
      <SpacesContainer />
    </main>
  )
}
