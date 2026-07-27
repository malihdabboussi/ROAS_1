'use client'

import { Suspense } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import SkillsPageContent from '@/features/settings/components/settings-content/SkillsPageContent'

export default function ManageSkillsPage() {
  return (
    <main className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <Suspense
          fallback={
            <div className="border-border rounded-spacing-3 flex min-h-0 w-full flex-1 items-center justify-center border">
              <VibeyLoadingOrb state="processing" size="sm" />
            </div>
          }
        >
          <SkillsPageContent />
        </Suspense>
      </div>
    </main>
  )
}
