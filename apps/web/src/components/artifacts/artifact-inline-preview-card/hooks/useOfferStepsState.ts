'use client'

import { useEffect, useState } from 'react'
import { buildOfferStepPreviews, fetchOffer } from '@/lib/artifacts'

export function useOfferStepsState(
  artifactId: string,
): Array<{ label: string; preview: string }> | null {
  const [steps, setSteps] = useState<Array<{ label: string; preview: string }> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOffer(artifactId).then((row) => {
      if (cancelled || !row) return
      setSteps(buildOfferStepPreviews(row))
    })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  return steps
}
