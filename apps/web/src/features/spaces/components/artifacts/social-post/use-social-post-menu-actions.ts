'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { patchReportingSocialPlatforms } from '@/features/spaces/components/reporting/shared/reporting-social-platforms'
import { buildNewViewDef } from '@/features/spaces/components/ViewSwitcher'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import {
  deleteSocialPost as deleteSocialPostRequest,
  unscheduleSocialPost,
  updateSocialPost,
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

const SOCIAL_POSTS_TABLE = 'social_posts'

/** Minimal shape the menu needs (compatible with `SocialPost` rows + preview state). */
export interface SocialPostMenuTarget {
  id: string
  caption?: string | null
  headline?: string | null
  status: string
  scheduled_at?: string | null
  campaign_id: string | null
  platform?: string | null
}

interface UseSocialPostMenuActionsArgs {
  post: SocialPostMenuTarget
  /** Called after a mutation that changes the row (status/schedule/duplicate/move/delete). */
  onChanged?: () => void
}

export interface SocialPostMenuActions {
  campaigns: Campaign[]
  campaignsLoading: boolean
  isReady: boolean
  isPublished: boolean
  isScheduled: boolean
  copyId(): Promise<void>
  rename(): Promise<void>
  markReady(): Promise<void>
  markDraft(): Promise<void>
  unschedule(): Promise<void>
  viewAnalytics(): Promise<void>
  duplicateInCurrentCampaign(): Promise<void>
  moveToCampaign(targetCampaignId: string): Promise<void>
  copyToCampaign(targetCampaignId: string): Promise<void>
  deletePost(): Promise<void>
  displayName: string
}

export function useSocialPostMenuActions({
  post,
  onChanged,
}: UseSocialPostMenuActionsArgs): SocialPostMenuActions {
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
    post.caption?.split('\n')[0]?.slice(0, 60).trim() ||
    post.headline?.slice(0, 60).trim() ||
    'Untitled Post'

  const isReady = post.status === 'ready'
  const isPublished = post.status === 'published'
  const isScheduled = Boolean(post.scheduled_at)

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyId = useCallback(async () => {
    await copyToClipboard(post.id, 'ID')
  }, [post.id, copyToClipboard])

  const rename = useCallback(async () => {
    const current = post.headline?.trim() || displayName
    const next = window.prompt('Rename social post', current)?.trim()
    if (!next || next === current) return
    try {
      await updateSocialPost(post.id, { headline: next })
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.RENAMED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Rename social post failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.RENAME_FAILED.userMessage)
    }
  }, [post.id, post.headline, displayName, onChanged])

  const viewAnalytics = useCallback(async () => {
    const state = useSpacesStore.getState()
    const space = state.spaces.find((s) => s.id === state.activeSpaceId)
    if (!space) return
    const schema = space.schema
    if (!schema) return
    const platform = post.platform === 'linkedin' ? 'linkedin' : 'instagram'
    const existing = (schema.views as ViewDef[] | undefined)?.find(
      (v) => v.type === 'social_reporting',
    )
    if (existing) {
      const next: ViewDef = {
        ...existing,
        reporting_config: {
          ...(existing.reporting_config ?? {}),
          ...patchReportingSocialPlatforms([platform]),
        },
      }
      const nextSchema = {
        ...schema,
        views: (schema.views ?? []).map((v) => (v.id === existing.id ? next : v)),
      }
      state.patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(space.id, { schema: nextSchema })
      } catch (err) {
        console.error('Persist social analytics platform failed:', err)
      }
      state.setActiveView(existing.id)
      return
    }
    try {
      const baseView = buildNewViewDef({
        type: 'social_reporting',
        label: 'Social Performance',
        icon: 'share-2',
        description: 'Instagram & LinkedIn reach, engagement, and follower growth',
        newViewId: `social_reporting_${post.id.slice(0, 6)}`,
      })
      const newView: ViewDef = {
        ...baseView,
        reporting_config: {
          ...(baseView.reporting_config ?? {}),
          ...patchReportingSocialPlatforms([platform]),
        },
      }
      const nextSchema = { ...schema, views: [...(schema.views ?? []), newView] }
      state.patchActiveSpaceSchema(nextSchema)
      await updateSpace(space.id, { schema: nextSchema })
      state.setActiveView(newView.id)
    } catch (err) {
      console.error('Create social analytics view failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.OPEN_ANALYTICS_FAILED.userMessage)
    }
  }, [post.id, post.platform])

  const markReady = useCallback(async () => {
    try {
      await updateSocialPost(post.id, { status: 'ready' })
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.MARKED_AS_READY.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Mark ready failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.MARK_READY_FAILED.userMessage)
    }
  }, [post.id, onChanged])

  const markDraft = useCallback(async () => {
    try {
      await updateSocialPost(post.id, { status: 'draft' })
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.MOVED_TO_DRAFT.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Move to draft failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.MOVE_TO_DRAFT_FAILED.userMessage)
    }
  }, [post.id, onChanged])

  const unschedule = useCallback(async () => {
    try {
      await unscheduleSocialPost(post.id)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.SCHEDULE_REMOVED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Unschedule social post failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.UNSCHEDULE_FAILED.userMessage)
    }
  }, [post.id, onChanged])

  const duplicateInCurrentCampaign = useCallback(async () => {
    if (!post.campaign_id) return
    try {
      await copyArtifactToCampaign(SOCIAL_POSTS_TABLE, post.id, post.campaign_id)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.DUPLICATED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Duplicate social post failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
    }
  }, [post.id, post.campaign_id, onChanged])

  const moveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === post.campaign_id) return
      try {
        await moveArtifactToCampaign(SOCIAL_POSTS_TABLE, post.id, targetCampaignId)
        toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.MOVED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Move social post failed:', err)
        toast.error(SPACES_ARTIFACT_TOAST_ERRORS.MOVE_FAILED.userMessage)
      }
    },
    [post.id, post.campaign_id, onChanged],
  )

  const copyToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (targetCampaignId === post.campaign_id) return
      try {
        await copyArtifactToCampaign(SOCIAL_POSTS_TABLE, post.id, targetCampaignId)
        toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.COPIED.userMessage)
        onChanged?.()
      } catch (err) {
        console.error('Copy social post failed:', err)
        toast.error(SPACES_ARTIFACT_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [post.id, post.campaign_id, onChanged],
  )

  const deletePost = useCallback(async () => {
    try {
      await deleteSocialPostRequest(post.id)
      toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.DELETED.userMessage)
      onChanged?.()
    } catch (err) {
      console.error('Delete social post failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.DELETE_FAILED.userMessage)
    }
  }, [post.id, onChanged])

  return {
    campaigns,
    campaignsLoading,
    isReady,
    isPublished,
    isScheduled,
    copyId,
    rename,
    markReady,
    markDraft,
    unschedule,
    viewAnalytics,
    duplicateInCurrentCampaign,
    moveToCampaign,
    copyToCampaign,
    deletePost,
    displayName,
  }
}
