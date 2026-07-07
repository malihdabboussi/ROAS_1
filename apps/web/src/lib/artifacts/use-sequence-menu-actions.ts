'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { deleteSequence as deleteSequenceRequest, updateSequence } from './artifact-menu-actions-api'
import type { SequenceMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const SEQUENCES_TABLE = 'sequences'
export type { SequenceMenuTarget } from './artifact-menu-contracts'

interface UseSequenceMenuActionsArgs {
  sequence: SequenceMenuTarget
  onChanged?: () => void
}

export interface SequenceMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteSequence(): Promise<void>
  displayName: string
}

export function useSequenceMenuActions({
  sequence,
  onChanged,
}: UseSequenceMenuActionsArgs): SequenceMenuActions {
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

  const displayName = sequence.name?.trim() || 'Untitled Sequence'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(sequence.id, 'ID')
  }, [sequence.id, copyToClipboard])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename sequence', displayName)?.trim()
    if (!next || next === displayName) return
    try {
      await updateSequence(sequence.id, next)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename sequence failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [sequence.id, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!sequence.campaign_id) return
    try {
      await copyArtifactToCampaign(SEQUENCES_TABLE, sequence.id, sequence.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate sequence failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [sequence.id, sequence.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === sequence.campaign_id) return
      try {
        await moveArtifactToCampaign(SEQUENCES_TABLE, sequence.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move sequence failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [sequence.id, sequence.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === sequence.campaign_id) return
      try {
        await copyArtifactToCampaign(SEQUENCES_TABLE, sequence.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy sequence failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [sequence.id, sequence.campaign_id, onChanged],
  )

  const deleteSequence = useCallback(async () => {
    try {
      await deleteSequenceRequest(sequence.id, 'keep_unsent')
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete sequence failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [sequence.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    copyId,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteSequence,
    displayName,
  }
}
