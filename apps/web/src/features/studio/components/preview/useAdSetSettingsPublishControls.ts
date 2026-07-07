import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { fetchAdSet } from '../../services/artifact-preview.service'
import type { AdSet } from '../../types'

interface UseAdSetSettingsPublishControlsParams {
  adSetId: string
  adSet: AdSet | null
  setAdSet: Dispatch<SetStateAction<AdSet | null>>
  onUpdated?: (adSet: AdSet) => void
}

export function useAdSetSettingsPublishControls({
  adSetId,
  adSet,
  setAdSet,
  onUpdated,
}: UseAdSetSettingsPublishControlsParams) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const openReviewModal = useCallback(() => {
    if (!adSet) return
    setReviewModalOpen(true)
  }, [adSet])

  const handlePublished = useCallback(async () => {
    const updated = await fetchAdSet(adSetId)
    setAdSet(updated)
    onUpdated?.(updated)
  }, [adSetId, onUpdated, setAdSet])

  return {
    reviewModalOpen,
    publishModalOpen,
    openReviewModal,
    closeReviewModal: () => setReviewModalOpen(false),
    continueToPublish: () => setPublishModalOpen(true),
    closePublishModal: () => setPublishModalOpen(false),
    handlePublished,
  }
}
