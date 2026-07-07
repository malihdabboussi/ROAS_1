import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import type { Presentation } from '../../../types'
import { updatePresentation } from '../../../services/artifact-preview.service'
import type { FunnelPixelEntry } from '../funnel-settings/funnel-pixel-utils'

interface UsePresentationPixelControlsOptions {
  presentations: Presentation[]
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
  activePresentationId: string | null | undefined
}

export function usePresentationPixelControls({
  presentations,
  setPresentations,
  activePresentationId,
}: UsePresentationPixelControlsOptions) {
  const [lmPixelSaving, setLmPixelSaving] = useState(false)
  const [lmPixelAddFlow, setLmPixelAddFlow] = useState('')

  useEffect(() => {
    setLmPixelAddFlow('')
  }, [activePresentationId])

  const handleUpdatePresentationPixels = useCallback(
    async (presentationId: string, pixels: FunnelPixelEntry[]) => {
      const currentPresentation = presentations.find((presentation) => presentation.id === presentationId)
      if (!currentPresentation) return
      const currentMetadata =
        currentPresentation.metadata && typeof currentPresentation.metadata === 'object'
          ? (currentPresentation.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = {
        ...currentMetadata,
        meta_pixels: pixels,
        meta_pixel_id: pixels[0]?.id ?? null,
      }
      setPresentations((prev) =>
        prev.map((presentation) =>
          presentation.id === presentationId ? { ...presentation, metadata: nextMetadata } : presentation,
        ),
      )
      setLmPixelSaving(true)
      try {
        await updatePresentation(presentationId, { metadata: nextMetadata })
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setPresentations((prev) =>
          prev.map((presentation) =>
            presentation.id === presentationId
              ? { ...presentation, metadata: currentPresentation.metadata ?? null }
              : presentation,
          ),
        )
      } finally {
        setLmPixelSaving(false)
      }
    },
    [presentations, setPresentations],
  )

  const handleUpdatePresentationMetaEvents = useCallback(
    async (presentationId: string, events: Record<string, string>) => {
      const currentPresentation = presentations.find((presentation) => presentation.id === presentationId)
      if (!currentPresentation) return
      const currentMetadata =
        currentPresentation.metadata && typeof currentPresentation.metadata === 'object'
          ? (currentPresentation.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = { ...currentMetadata, meta_events: events }
      setPresentations((prev) =>
        prev.map((presentation) =>
          presentation.id === presentationId ? { ...presentation, metadata: nextMetadata } : presentation,
        ),
      )
      setLmPixelSaving(true)
      try {
        await updatePresentation(presentationId, { metadata: nextMetadata })
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setPresentations((prev) =>
          prev.map((presentation) =>
            presentation.id === presentationId
              ? { ...presentation, metadata: currentPresentation.metadata ?? null }
              : presentation,
          ),
        )
      } finally {
        setLmPixelSaving(false)
      }
    },
    [presentations, setPresentations],
  )

  return {
    lmPixelSaving,
    lmPixelAddFlow,
    setLmPixelAddFlow,
    handleUpdatePresentationPixels,
    handleUpdatePresentationMetaEvents,
  }
}
