'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { deleteEmailArtifact, updateEmailArtifact } from './artifact-menu-actions-api'
import type { EmailMenuTarget } from './artifact-menu-contracts'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'

const EMAILS_TABLE = 'emails'
export type { EmailMenuTarget } from './artifact-menu-contracts'

interface UseEmailMenuActionsArgs {
  email: EmailMenuTarget
  onChanged?: () => void
}

export interface EmailMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteEmail(): Promise<void>
  displayName: string
}

export function useEmailMenuActions({
  email,
  onChanged,
}: UseEmailMenuActionsArgs): EmailMenuActions {
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

  const displayName = email.subject?.trim() || 'Untitled Email'

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(email.id, 'ID')
  }, [email.id, copyToClipboard])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename email (subject)', displayName)?.trim()
    if (!next || next === displayName) return
    try {
      await updateEmailArtifact(email.id, { subject: next })
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename email failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [email.id, displayName, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!email.campaign_id) return
    try {
      await copyArtifactToCampaign(EMAILS_TABLE, email.id, email.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate email failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [email.id, email.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === email.campaign_id) return
      try {
        await moveArtifactToCampaign(EMAILS_TABLE, email.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move email failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [email.id, email.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === email.campaign_id) return
      try {
        await copyArtifactToCampaign(EMAILS_TABLE, email.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy email failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [email.id, email.campaign_id, onChanged],
  )

  const deleteEmail = useCallback(async () => {
    try {
      await deleteEmailArtifact(email.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete email failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [email.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    copyId,
    rename,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteEmail,
    displayName,
  }
}
