'use client'

import { useEffect, useState } from 'react'
import type { UiSelectedArtifact } from './ui-selected-artifact'

const ACTIVE_ARTIFACT_EVENT = 'vibey-active-artifact-changed'

export function emitActiveArtifactSelection(artifact: UiSelectedArtifact | null): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ACTIVE_ARTIFACT_EVENT, { detail: artifact }))
}

export function useActiveArtifactSelectionSignal(): UiSelectedArtifact | null {
  const [artifact, setArtifact] = useState<UiSelectedArtifact | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<UiSelectedArtifact | null>).detail
      setArtifact(detail ?? null)
    }
    window.addEventListener(ACTIVE_ARTIFACT_EVENT, handler)
    return () => window.removeEventListener(ACTIVE_ARTIFACT_EVENT, handler)
  }, [])

  return artifact
}
