'use client'

import { Suspense } from 'react'
import { MissionReliabilityContainer } from '@/features/mission-reliability'

export default function MissionReliabilityPage() {
  return (
    <div className="p-spacing-6 w-full">
      <Suspense
        fallback={<div className="body-3 text-muted-foreground">Loading mission reliability…</div>}
      >
        <MissionReliabilityContainer />
      </Suspense>
    </div>
  )
}
