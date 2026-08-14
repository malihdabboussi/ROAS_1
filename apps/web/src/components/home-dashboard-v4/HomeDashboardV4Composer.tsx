'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FolderKanban, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { QuickMissionsHubHost } from '@/components/global-chat/components/QuickMissionsHubHost'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { SHELL_EMPTY_CHAT_PLACEHOLDER } from '@/components/shell/shell-empty-chat-prompts.config'
import { ShellEmptyChatQuickStartPills } from '@/components/shell/ShellEmptyChatQuickStartPills'
import { useShellChatQuickStart } from '@/components/shell/use-shell-chat-quick-start'
import { SuggestedNextMoves } from '@/features/home/components/SuggestedNextMoves'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { CreateSpaceModal } from '@/features/spaces/components/CreateSpaceModal'
import { cachedSpaces, useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { normalizeSpaceLegacyViews } from '@/features/spaces/lib/view-customization-merge'
import { createSpace, ensureGeneralSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { AttachedArtifact } from '@/features/studio/components/chat/ArtifactAttachments'
import { ChatInput } from '@/features/studio/components/ChatInput'
import { INTEGRATION_ICONS } from '@/features/studio/components/ChatInput/chat-input-constants'
import type { ChatInputPlusMenuSpacePickerConfig } from '@/features/studio/components/ChatInput/chat-input-plus-menu-space.types'
import type { ComposerPlusSubmenu } from '@/features/studio/components/ChatInput/chat-input-policy'
import { campaignListCacheKey, fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { ChatModelSettings } from '@/features/studio/services/chat.service'
import type { Campaign, DocumentAttachment, MessageReference } from '@/features/studio/types'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { matchesFlowsConceptSpace } from '@/lib/flows/flows-scope-storage'
import { QuickMissionsLauncherProvider } from '@/lib/missions'
import { fetchPrograms, type Program } from '@/lib/programs'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function HomeDashboardV4Composer() {
  const [quickMissionsOpen, setQuickMissionsOpen] = useState(false)
  const router = useRouter()
  const seedComposer = useGlobalChatStore((s) => s.seedComposer)
  const clearMeetingContext = useGlobalChatStore((s) => s.clearMeetingContext)
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const setActiveAgentKey = useGlobalChatStore((s) => s.setActiveAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const { data: cachedSpaceRows } = useCachedSpaces()
  const spaces = useMemo(() => cachedSpaceRows ?? [], [cachedSpaceRows])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [targetSpaceId, setTargetSpaceId] = useState<string | null>(null)
  const [targetCampaignId, setTargetCampaignId] = useState<string | null>(null)
  const [createSpaceCampaignId, setCreateSpaceCampaignId] = useState<string | null | undefined>(
    undefined,
  )
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const openAddMenuRef = useRef<
    ((submenu?: ComposerPlusSubmenu, anchor?: HTMLElement) => void) | null
  >(null)
  const quickStart = useShellChatQuickStart(setTextRef)
  const isOrgOnly = useOrgStore((s) => s.isOrgOnly)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      cachedFetch(campaignListCacheKey(), fetchCampaigns, { ttlMs: 60_000 }),
      fetchPrograms(),
    ])
      .then(([campaignRows, programRows]) => {
        if (!cancelled) {
          setCampaigns(campaignRows as Campaign[])
          setPrograms(programRows)
        }
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groupedSpaces = useMemo(() => {
    const programNameById = new Map(programs.map((program) => [program.id, program.name]))
    return [...campaigns]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((campaign) => ({
        programId: campaign.program_id ?? null,
        programName: campaign.program_id
          ? (programNameById.get(campaign.program_id) ?? 'General')
          : 'General',
        campaignId: campaign.id,
        campaignName: campaign.name,
        spaces: spaces
          .filter((s) => s.campaign_id === campaign.id)
          .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
          .map((space) => ({ id: space.id, title: space.title })),
      }))
  }, [campaigns, programs, spaces])

  const defaultGeneralSpace = useMemo(() => {
    const generalCampaignId =
      campaigns.find(
        (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
      )?.id ?? null
    if (!generalCampaignId) return null
    return (
      [...spaces]
        .filter(
          (space) => space.campaign_id === generalCampaignId && !matchesFlowsConceptSpace(space),
        )
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
    if (targetCampaignId) {
      return campaigns.find((campaign) => campaign.id === targetCampaignId)?.name ?? 'Campaign'
    }
    if (isOrgOnly) return spaces[0]?.title ?? 'Workspace'
    return defaultGeneralSpace?.title ?? 'New Workspace'
  }, [campaigns, defaultGeneralSpace, isOrgOnly, spaces, targetCampaignId, targetSpaceId])

  const activeCampaignId = useMemo(() => {
    if (targetSpaceId) {
      return spaces.find((space) => space.id === targetSpaceId)?.campaign_id ?? null
    }
    return targetCampaignId ?? defaultGeneralSpace?.campaign_id ?? null
  }, [defaultGeneralSpace, spaces, targetCampaignId, targetSpaceId])

  const plusMenuSpacePicker = useMemo<ChatInputPlusMenuSpacePickerConfig>(
    () => ({
      selectedSpaceId: targetSpaceId,
      selectedCampaignId: targetCampaignId,
      selectedLabel: targetLabel,
      defaultSpaceTitle: defaultGeneralSpace?.title ?? null,
      isOrgOnly,
      groups: groupedSpaces,
      onSelect: (spaceId) => {
        setTargetSpaceId(spaceId)
        setTargetCampaignId(
          spaceId ? (spaces.find((space) => space.id === spaceId)?.campaign_id ?? null) : null,
        )
      },
      onSelectCampaign: (campaignId) => {
        setTargetSpaceId(null)
        setTargetCampaignId(campaignId)
      },
      onCreateSpace: setCreateSpaceCampaignId,
    }),
    [
      defaultGeneralSpace?.title,
      groupedSpaces,
      isOrgOnly,
      spaces,
      targetCampaignId,
      targetLabel,
      targetSpaceId,
    ],
  )
  const agentPicker = useMemo(
    () => ({
      selectedAgentKey: activeAgentKey,
      agents: roster
        .filter((entry) => entry.kind === 'agent' && Boolean(entry.agent_key?.trim()))
        .map((entry) => ({
          key: entry.agent_key!,
          name: entry.display_name,
          roleLabel: entry.role_label,
          avatarUrl: entry.avatar_url,
        })),
      onSelect: setActiveAgentKey,
    }),
    [activeAgentKey, roster, setActiveAgentKey],
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
        let targetId: string | null =
          targetSpaceId ?? (targetCampaignId ? null : (defaultGeneralSpace?.id ?? null))
        let resolvedCampaignId: string | null = activeCampaignId
        if (!targetId && !resolvedCampaignId) {
          if (isOrgOnly) {
            targetId = spaces[0]?.id ?? null
            resolvedCampaignId = spaces[0]?.campaign_id ?? null
          } else {
            const generalSpace = normalizeSpaceLegacyViews(await ensureGeneralSpace())
            targetId = generalSpace.id
            resolvedCampaignId = generalSpace.campaign_id ?? null
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

        // A previously opened meeting workspace leaves its context attached;
        // a fresh chat seeded from Home must not hydrate into that thread.
        clearMeetingContext()
        seedComposer({
          content,
          agentKey: activeAgentKey,
          railIntent: 'new',
          documents,
          artifacts,
          model,
          references,
          modelSettings,
          workContext:
            targetId || resolvedCampaignId
              ? {
                  surface: 'spaces',
                  ...(targetId ? { spaceId: targetId } : {}),
                  campaignId: resolvedCampaignId,
                }
              : { surface: 'general' },
        })
        router.push('/home?chat=starting')
      } catch (error) {
        toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.SEND_MESSAGE_FAILED.userMessage))
      } finally {
        setSending(false)
      }
    },
    [
      activeAgentKey,
      activeCampaignId,
      clearMeetingContext,
      defaultGeneralSpace?.id,
      isOrgOnly,
      router,
      seedComposer,
      sending,
      spaces,
      targetSpaceId,
      targetCampaignId,
    ],
  )

  const handleConnectedProvidersChange = useCallback((providers: string[]) => {
    setConnectedProviders(providers)
  }, [])

  return (
    <QuickMissionsLauncherProvider>
      <div className="w-full max-w-3xl">
        <QuickMissionsHubHost
          open={quickMissionsOpen ? true : undefined}
          onClose={() => setQuickMissionsOpen(false)}
        />
        <ShellEmptyChatQuickStartPills
          onSelect={quickStart.selectQuickStart}
          onMission={() => setQuickMissionsOpen(true)}
          missionOpen={quickMissionsOpen}
        />
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          agentKey={activeAgentKey}
          placeholder={SHELL_EMPTY_CHAT_PLACEHOLDER}
          draftContextKeyOverride="home-dashboard-v4"
          spaceId={targetSpaceId}
          campaignId={activeCampaignId ?? undefined}
          plusMenuSpacePicker={plusMenuSpacePicker}
          plusMenuAgentPicker={agentPicker}
          openAddMenuRef={openAddMenuRef}
          onConnectedIntegrationProvidersChange={handleConnectedProvidersChange}
          setTextRef={setTextRef}
          onComposerValueChange={quickStart.handleComposerValueChange}
          activeCapabilityChip={quickStart.activeCapabilityChip}
          onClearCapabilityChip={quickStart.clearQuickStart}
        />
        <div className="surface-card border-border mx-spacing-3 p-spacing-2 rounded-b-2xl border-x border-b">
          <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
            <button
              type="button"
              onClick={(event) => openAddMenuRef.current?.('space', event.currentTarget)}
              className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex max-w-52 shrink-0 items-center transition-colors"
              aria-label="Choose Space"
            >
              <FolderKanban className="icon-sm shrink-0" aria-hidden />
              <span className="truncate">
                {targetSpaceId || targetCampaignId ? targetLabel : 'Choose Space'}
              </span>
              <ChevronDown className="icon-xs shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(event) => openAddMenuRef.current?.('integrations', event.currentTarget)}
              className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex shrink-0 items-center transition-colors"
              aria-label="Plugins and integrations"
            >
              <Plug className="icon-sm" aria-hidden />
              Plugins
              {connectedProviders
                .slice(0, 3)
                .map((provider) =>
                  INTEGRATION_ICONS[provider] ? (
                    <Image
                      key={provider}
                      src={INTEGRATION_ICONS[provider]}
                      alt=""
                      width={18}
                      height={18}
                      className="rounded-spacing-1"
                    />
                  ) : null,
                )}
            </button>
          </div>
        </div>
        <div className="mt-spacing-4">
          <SuggestedNextMoves onSelectPrompt={(prompt) => setTextRef.current?.(prompt)} />
        </div>
        {createSpaceCampaignId !== undefined ? (
          <CreateSpaceModal
            open
            onOpenChange={(open) => {
              if (!open) setCreateSpaceCampaignId(undefined)
            }}
            onCreate={async (payload) => {
              const created = normalizeSpaceLegacyViews(
                await createSpace({
                  ...payload,
                  ...(createSpaceCampaignId ? { campaign_id: createSpaceCampaignId } : {}),
                }),
              )
              cachedSpaces.mutate((current) => [created, ...(current ?? [])])
              setTargetSpaceId(created.id)
              setTargetCampaignId(created.campaign_id ?? null)
            }}
          />
        ) : null}
      </div>
    </QuickMissionsLauncherProvider>
  )
}
