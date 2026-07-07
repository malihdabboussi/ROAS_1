'use client'

import { Suspense } from 'react'
import { FinancesContainer } from '@/features/finances'

export default function FinancesPage() {
  return (
    <div className="p-spacing-6 w-full">
      <Suspense fallback={<div className="body-3 text-muted-foreground">Loading finances...</div>}>
        <FinancesContainer />
      </Suspense>
    </div>
  )
}
