'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import BrainHome from '@/features/brain/containers/BrainHome'

// The scoped visualization (~5k lines incl. ForceGraph, NodeDetailModal,
// panels, realtime hooks) only renders with `?scope=` — load it on demand so
// plain /brain visits don't parse the whole subtree.
const BrainVisualization = dynamic(() => import('@/features/brain/components/BrainVisualization'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading Brain..." state="processing" size="lg" />
    </div>
  ),
})

function BrainRouter() {
  const searchParams = useSearchParams()
  const hasScope = searchParams.has('scope')
  if (hasScope) return <BrainVisualization />
  return <BrainHome />
}

export default function BrainPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <VibeyLoadingOrb text="Loading Brain..." state="processing" size="lg" />
          </div>
        }
      >
        <BrainRouter />
      </Suspense>
    </div>
  )
}
