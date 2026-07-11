'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import {
  homeDashboardTemplate,
  type HomeDashboardTemplateId,
} from '@/features/home/config/home-dashboard-v4.config'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { cachedSpaces, useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { normalizeSpaceLegacyViews } from '@/features/spaces/lib/view-customization-merge'
import { ensureGeneralSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { AttachedArtifact } from '@/features/studio/components/chat/ArtifactAttachments'
import { ChatInput } from '@/features/studio/components/ChatInput'
import type { ChatInputPlusMenuSpacePickerConfig } from '@/features/studio/components/ChatInput/chat-input-plus-menu-space.types'
import { campaignListCacheKey, fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { ChatModelSettings } from '@/features/studio/services/chat.service'
import type { Campaign, DocumentAttachment, MessageReference } from '@/features/studio/types'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function HomeDashboardV4Composer({
  selectedTemplate,
}: {
  selectedTemplate: HomeDashboardTemplateId | null
}) {
  const seedComposer = useGlobalChatStore((s) => s.seedComposer)
  const { data: cachedSpaceRows } = useCachedSpaces()
  const spaces = useMemo(() => cachedSpaceRows ?? [], [cachedSpaceRows])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [targetSpaceId, setTargetSpaceId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const isOrgOnly = useOrgStore((s) => s.isOrgOnly)

  useEffect(() => {
    let cancelled = false
    void cachedFetch(campaignListCacheKey(), fetchCampaigns, { ttlMs: 60_000 })
      .then((campaignRows) => {
        if (!cancelled) setCampaigns(campaignRows as Campaign[])
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groupedSpaces = useMemo(() => {
    const generalCampaign =
      campaigns.find(
        (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
      ) ?? null
    const otherCampaigns = campaigns.filter((c) => c.id !== generalCampaign?.id)
    const sortedOthers = [...otherCampaigns].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? ''),
    )
    const ordered: Campaign[] = generalCampaign ? [generalCampaign, ...sortedOthers] : sortedOthers
    return ordered
      .map((campaign) => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        spaces: spaces
          .filter((s) => s.campaign_id === campaign.id)
          .sort((a, b) => {
            const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
            const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
            return bTime - aTime
          })
          .map((space) => ({ id: space.id, title: space.title })),
      }))
      .filter((group) => group.spaces.length > 0)
  }, [campaigns, spaces])

  const defaultGeneralSpace = useMemo(() => {
    const generalCampaignId =
      campaigns.find(
        (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
      )?.id ?? null
    if (!generalCampaignId) return null
    return (
      [...spaces]
        .filter((space) => space.campaign_id === generalCampaignId)
        .sort((a, b) => {
          const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
          const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
          return bTime - aTime
        })[0] ?? null
    )
  }, [campaigns, spaces])

  const targetLabel = useMemo(() => {
    if (targetSpaceId) {
      return spaces.find((space) => space.id === targetSpaceId)?.title ?? 'Space'
    }
    if (isOrgOnly) return spaces[0]?.title ?? 'Workspace'
    return defaultGeneralSpace?.title ?? 'New Workspace'
  }, [defaultGeneralSpace, isOrgOnly, spaces, targetSpaceId])

  const activeCampaignId = useMemo(() => {
    if (targetSpaceId) {
      return spaces.find((space) => space.id === targetSpaceId)?.campaign_id ?? null
    }
    return defaultGeneralSpace?.campaign_id ?? null
  }, [defaultGeneralSpace, spaces, targetSpaceId])

  const committedTemplate = homeDashboardTemplate(selectedTemplate)

  const placeholder = useMemo(() => {
    if (committedTemplate) return committedTemplate.placeholder
    return 'Tell Vibey what to do…'
  }, [committedTemplate])

  const plusMenuSpacePicker = useMemo<ChatInputPlusMenuSpacePickerConfig>(
    () => ({
      selectedSpaceId: targetSpaceId,
      selectedLabel: targetLabel,
      defaultSpaceTitle: defaultGeneralSpace?.title ?? null,
      isOrgOnly,
      groups: groupedSpaces,
      onSelect: setTargetSpaceId,
    }),
    [defaultGeneralSpace?.title, groupedSpaces, isOrgOnly, targetLabel, targetSpaceId],
  )

  const handleSend = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (sending) return
      setSending(true)
      try {
        let targetId: string | null = targetSpaceId
        let targetCampaignId: string | null = activeCampaignId
        if (!targetId) {
          if (isOrgOnly) {
            targetId = spaces[0]?.id ?? null
            targetCampaignId = spaces[0]?.campaign_id ?? null
          } else {
            const generalSpace = normalizeSpaceLegacyViews(await ensureGeneralSpace())
            targetId = generalSpace.id
            targetCampaignId = generalSpace.campaign_id ?? null
            cachedSpaces.mutate((prev) => {
              const current = prev ?? []
              return current.some((space) => space.id === generalSpace.id)
                ? current
                : [generalSpace, ...current]
            })
            useSpacesStore.setState((state) => ({
              spaces: state.spaces.some((space) => space.id === generalSpace.id)
                ? state.spaces
                : [generalSpace, ...state.spaces],
            }))
          }
        }

        seedComposer({
          content,
          documents,
          artifacts,
          model,
          references,
          modelSettings,
          workContext: targetId
            ? {
                surface: 'spaces',
                spaceId: targetId,
                campaignId: targetCampaignId,
              }
            : { surface: 'general' },
        })
      } catch (error) {
        toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.SEND_MESSAGE_FAILED.userMessage))
      } finally {
        setSending(false)
      }
    },
    [activeCampaignId, isOrgOnly, seedComposer, sending, spaces, targetSpaceId],
  )

  return (
    <ChatInput
      onSend={handleSend}
      disabled={sending}
      agentKey="vibey"
      placeholder={placeholder}
      draftContextKeyOverride="home-dashboard-v4"
      spaceId={targetSpaceId}
      campaignId={activeCampaignId ?? undefined}
      plusMenuSpacePicker={plusMenuSpacePicker}
      footerWrapperClassName="home-composer-v4-standard-footer"
      wrapperClass="home-composer-v4-shell bg-transparent border-0 p-0 overflow-visible"
    />
  )
}
