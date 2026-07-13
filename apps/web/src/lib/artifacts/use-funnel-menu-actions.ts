'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  type Campaign,
} from '@/lib/campaigns'
import { buildPublishedFunnelUrl } from '@/lib/platform/platform-urls'
import {
  ARTIFACT_MENU_TOAST_ERRORS,
  ARTIFACT_MENU_TOAST_SUCCESS,
} from './artifact-menu-toast-messages'
import type { FunnelMenuTarget } from './artifact-menu-contracts'
import {
  connectFunnelCustomDomain,
  deleteFunnel as deleteFunnelRequest,
  publishFunnel,
  unpublishFunnel,
  updateFunnel,
} from './funnel-preview-api'

const FUNNELS_TABLE = 'funnels'

export type { FunnelMenuTarget }

interface UseFunnelMenuActionsArgs {
  funnel: FunnelMenuTarget
  onChanged?: () => void
}

export interface FunnelMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  isPublished: boolean
  liveUrl: string | null
  copyLink(): Promise<void>
  copyId(): Promise<void>
  openInNewTab(): void
  rename(): Promise<void>
  publish(): Promise<void>
  unpublish(): Promise<void>
  connectCustomDomain(domainId: string): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deleteFunnel(): Promise<void>
}

export function useFunnelMenuActions({
  funnel,
  onChanged,
}: UseFunnelMenuActionsArgs): FunnelMenuActions {
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

  const isPublished = funnel.status === 'published'
  const liveUrl = funnel.published_url || (funnel.slug ? buildPublishedFunnelUrl(funnel.slug) : null)

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyLink = useCallback(async () => {
    if (!liveUrl) return
    await copyToClipboard(liveUrl, 'Link')
  }, [copyToClipboard, liveUrl])

  const copyId = useCallback(async () => {
    await copyToClipboard(funnel.id, 'ID')
  }, [copyToClipboard, funnel.id])

  const openInNewTab = useCallback(() => {
    if (!liveUrl) return
    window.open(liveUrl, '_blank', 'noopener,noreferrer')
  }, [liveUrl])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename funnel', funnel.name)?.trim()
    if (!next || next === funnel.name) return
    try {
      await updateFunnel(funnel.id, { name: next })
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename funnel failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [funnel.id, funnel.name, onChanged])

  const publish = useCallback(async () => {
    try {
      await publishFunnel(funnel.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.PUBLISHED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Publish funnel failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.PUBLISH_FAILED.userMessage)
    }
  }, [funnel.id, onChanged])

  const unpublish = useCallback(async () => {
    try {
      await unpublishFunnel(funnel.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.UNPUBLISHED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Unpublish funnel failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.UNPUBLISH_FAILED.userMessage)
    }
  }, [funnel.id, onChanged])

  const connectCustomDomain = useCallback(
    async (domainId: string) => {
      try {
        const result = await connectFunnelCustomDomain(funnel.id, domainId)
        if (!result?.success) throw new Error('Connect failed')
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DOMAIN_CONNECTED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Connect custom domain failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.CONNECT_DOMAIN_FAILED.userMessage)
      }
    },
    [funnel.id, onChanged],
  )

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!funnel.campaign_id) return
    try {
      await copyArtifactToCampaign(FUNNELS_TABLE, funnel.id, funnel.campaign_id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate funnel failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [funnel.id, funnel.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === funnel.campaign_id) return
      try {
        await moveArtifactToCampaign(FUNNELS_TABLE, funnel.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move funnel failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [funnel.id, funnel.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === funnel.campaign_id) return
      try {
        await copyArtifactToCampaign(FUNNELS_TABLE, funnel.id, targetCampaignId)
        toast.success(ARTIFACT_MENU_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy funnel failed:', err)
        toast.error(ARTIFACT_MENU_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [funnel.id, funnel.campaign_id, onChanged],
  )

  const deleteFunnel = useCallback(async () => {
    try {
      await deleteFunnelRequest(funnel.id)
      toast.success(ARTIFACT_MENU_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete funnel failed:', err)
      toast.error(ARTIFACT_MENU_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [funnel.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    isPublished,
    liveUrl,
    copyLink,
    copyId,
    openInNewTab,
    rename,
    publish,
    unpublish,
    connectCustomDomain,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deleteFunnel,
  }
}
