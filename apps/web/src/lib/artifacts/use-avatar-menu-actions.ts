'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { deleteAvatar as deleteAvatarRequest, updateAvatar } from './artifact-menu-actions-api'
import type { AvatarMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const AVATARS_TABLE = 'avatars'
export type { AvatarMenuTarget } from './artifact-menu-contracts'

interface UseAvatarMenuActionsArgs {
  avatar: AvatarMenuTarget
  onChanged?: () => void
}

export interface AvatarMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteAvatar(): Promise<void>
  displayName: string
}

export function useAvatarMenuActions({
  avatar,
  onChanged,
}: UseAvatarMenuActionsArgs): AvatarMenuActions {
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

  const displayName = avatar.name?.trim() || 'Untitled Avatar'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(avatar.id, 'ID')
  }, [avatar.id, copyToClipboard])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename avatar', displayName)?.trim()
    if (!next || next === displayName) return
    try {
      await updateAvatar(avatar.id, { name: next })
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename avatar failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [avatar.id, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!avatar.campaign_id) return
    try {
      await copyArtifactToCampaign(AVATARS_TABLE, avatar.id, avatar.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate avatar failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [avatar.id, avatar.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === avatar.campaign_id) return
      try {
        await moveArtifactToCampaign(AVATARS_TABLE, avatar.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move avatar failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [avatar.id, avatar.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === avatar.campaign_id) return
      try {
        await copyArtifactToCampaign(AVATARS_TABLE, avatar.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy avatar failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [avatar.id, avatar.campaign_id, onChanged],
  )

  const deleteAvatarAction = useCallback(async () => {
    try {
      await deleteAvatarRequest(avatar.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete avatar failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [avatar.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    copyId,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteAvatar: deleteAvatarAction,
    displayName,
  }
}
