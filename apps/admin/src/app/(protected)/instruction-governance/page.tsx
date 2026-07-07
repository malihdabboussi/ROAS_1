'use client'

import { Suspense } from 'react'
import { InstructionGovernanceContainer } from '@/features/instruction-governance'

export default function InstructionGovernancePage() {
  return (
    <Suspense
      fallback={
        <div className="body-3 text-muted-foreground">Loading instruction governance…</div>
      }
    >
      <InstructionGovernanceContainer />
    </Suspense>
  )
}
