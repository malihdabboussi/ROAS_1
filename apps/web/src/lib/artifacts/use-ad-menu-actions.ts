'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { deleteAd as deleteAdRequest, updateAd } from './artifact-menu-actions-api'
import type { AdMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const ADS_TABLE = 'ads'
export type { AdMenuTarget } from './artifact-menu-contracts'

interface UseAdMenuActionsArgs {
  ad: AdMenuTarget
  onChanged?: () => void
}

export interface AdMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteAd(): Promise<void>
  displayName: string
}

export function useAdMenuActions({ ad, onChanged }: UseAdMenuActionsArgs): AdMenuActions {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)

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

  const displayName =
    ad.headline?.trim() || ad.primary_text?.split('\n')[0]?.slice(0, 80).trim() || 'Untitled Ad'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(ad.id, 'ID')
  }, [ad.id, copyToClipboard])

  const rename = useCallback(async () => {
    const current = ad.headline?.trim() || displayName
    const next = window.prompt('Rename ad', current)?.trim()
    if (!next || next === current) return
    try {
      await updateAd(ad.id, { headline: next })
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename ad failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [ad.id, ad.headline, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!ad.campaign_id) return
    try {
      await copyArtifactToCampaign(ADS_TABLE, ad.id, ad.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate ad failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [ad.id, ad.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === ad.campaign_id) return
      try {
        await moveArtifactToCampaign(ADS_TABLE, ad.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move ad failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [ad.id, ad.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === ad.campaign_id) return
      try {
        await copyArtifactToCampaign(ADS_TABLE, ad.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy ad failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [ad.id, ad.campaign_id, onChanged],
  )

  const deleteAdAction = useCallback(async () => {
    try {
      await deleteAdRequest(ad.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete ad failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [ad.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    copyId,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteAd: deleteAdAction,
    displayName,
  }
}
