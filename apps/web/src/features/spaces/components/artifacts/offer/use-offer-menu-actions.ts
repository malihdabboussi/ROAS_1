'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import {
  deleteOffer as deleteOfferRequest,
  updateOffer,
} from '@/features/studio/services/artifact-preview.service'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
} from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import {
  SPACES_ARTIFACT_TOAST_ERRORS,
  SPACES_ARTIFACT_TOAST_SUCCESS,
} from '../../../config/spaces-toast-errors.config'
import { ARTIFACT_QUERY_KEY } from '../use-artifact-detail-query'

const OFFERS_TABLE = 'offers'

/** Minimal shape for Spaces offer rows (`row.raw`). */
export interface OfferMenuTarget {
  id: string
  name: string | null
  campaign_id: string | null
}

interface UseOfferMenuActionsArgs {
  offer: OfferMenuTarget
  onChanged?: () => void
}

export interface OfferMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  /** Spaces deep link (org teammate opens same space + offer detail), or null if no active space. */
  shareUrl: string | null
  copyLink(): Promise<void>
  copyId(): Promise<void>
  openInNewTab(): void
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteOffer(): Promise<void>
}

export function useOfferMenuActions({
  offer,
  onChanged,
}: UseOfferMenuActionsArgs): OfferMenuActions {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const activeViewId = useSpacesStore((s) => s.activeViewId)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !activeSpaceId) return null
    const p = new URLSearchParams()
    p.set('space', activeSpaceId)
    if (activeViewId) p.set('v', activeViewId)
    p.set(ARTIFACT_QUERY_KEY, offer.id)
    return `${window.location.origin}/spaces?${p.toString()}`
  }, [activeSpaceId, activeViewId, offer.id])

  useEffect(() => {
    let cancelled = false
    setCampaignsLoading(true)
    fetchCampaigns()
      .then((cs) => {
        if (!cancelled) setCampaigns(cs)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = offer.name?.trim() || 'Untitled Offer'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(offer.id, 'ID')
  }, [offer.id, copyToClipboard])

  const copyLink = useCallback(async () => {
    if (!shareUrl) return
    await copyToClipboard(shareUrl, 'Link')
  }, [shareUrl, copyToClipboard])

  const openInNewTab = useCallback(() => {
    if (!shareUrl) return
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }, [shareUrl])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename offer', displayName)?.trim()
    if (!next || next === displayName) return
    try {
      await updateOffer(offer.id, next)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename offer failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [offer.id, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!offer.campaign_id) return
    try {
      await copyArtifactToCampaign(OFFERS_TABLE, offer.id, offer.campaign_id)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate offer failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [offer.id, offer.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === offer.campaign_id) return
      try {
        await moveArtifactToCampaign(OFFERS_TABLE, offer.id, targetCampaignId)
        toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move offer failed:', err)
        toast.error(SPACES_ARTIFACT_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [offer.id, offer.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === offer.campaign_id) return
      try {
        await copyArtifactToCampaign(OFFERS_TABLE, offer.id, targetCampaignId)
        toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy offer failed:', err)
        toast.error(SPACES_ARTIFACT_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [offer.id, offer.campaign_id, onChanged],
  )

  const deleteOfferFn = useCallback(async () => {
    try {
      await deleteOfferRequest(offer.id)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete offer failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [offer.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    shareUrl,
    copyLink,
    copyId,
    openInNewTab,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteOffer: deleteOfferFn,
  }
}
