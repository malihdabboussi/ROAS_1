'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export function BillingLoadingView() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading Billing..." state="processing" size="sm" />
    </div>
  )
}
