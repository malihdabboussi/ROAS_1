'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { deletePresentation, updatePresentation } from './artifact-menu-actions-api'
import type { PresentationMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const PRESENTATIONS_TABLE = 'presentations'
export type { PresentationMenuTarget } from './artifact-menu-contracts'

interface UsePresentationMenuActionsArgs {
  presentation: PresentationMenuTarget
  onChanged?: () => void
}

export interface PresentationMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deletePresentation(): Promise<void>
  displayName: string
}

export function usePresentationMenuActions({
  presentation,
  onChanged,
}: UsePresentationMenuActionsArgs): PresentationMenuActions {
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

  const displayName = presentation.name?.trim() || 'Untitled Presentation'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(presentation.id, 'ID')
  }, [presentation.id, copyToClipboard])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename presentation', displayName)?.trim()
    if (!next || next === displayName) return
    try {
      await updatePresentation(presentation.id, { name: next })
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename presentation failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [presentation.id, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!presentation.campaign_id) return
    try {
      await copyArtifactToCampaign(PRESENTATIONS_TABLE, presentation.id, presentation.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate presentation failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [presentation.id, presentation.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === presentation.campaign_id) return
      try {
        await moveArtifactToCampaign(PRESENTATIONS_TABLE, presentation.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move presentation failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [presentation.id, presentation.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === presentation.campaign_id) return
      try {
        await copyArtifactToCampaign(PRESENTATIONS_TABLE, presentation.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy presentation failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [presentation.id, presentation.campaign_id, onChanged],
  )

  const deletePresentationAction = useCallback(async () => {
    try {
      await deletePresentation(presentation.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete presentation failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [presentation.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    copyId,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deletePresentation: deletePresentationAction,
    displayName,
  }
}
