import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import type { VibeyPendingArtifactOpenSimpleType } from '@/lib/artifacts/pending-artifact-open'
import type { Campaign } from '@/lib/campaigns'
import { fetchCampaign } from '@/lib/campaigns'
import { useChatStore, type Conversation } from '@/lib/chat/studio-chat-runtime-adapter'
import { createClient } from '@/lib/supabase/client'
import {
  buildMobileCampaignSwitcherOptions,
  findLatestSessionForCampaign,
  isGeneralCampaignId,
  resolveDefaultNewConversationCampaignId,
  writeCampaignScope,
  type MobileCampaignSwitcherOption,
} from './agent-chat-panel.logic'

interface MobilePreviewInfo {
  name: string
  hasSettings: boolean
}

interface UseAgentChatCampaignControllerInput {
  agentKey: string
  selectedSession: Conversation | null
  activeCampaignId: string | null
  generalCampaignId?: string
  assignedCampaigns?: Campaign[]
  nonGeneralCampaigns: Campaign[]
  sessions: Conversation[]
  isMobile: boolean
  campaignPanelOpen: boolean
  hideCampaignPanel: boolean
  isPanelMinimized: boolean
  newConversationCampaignScopeRef: MutableRefObject<string | null>
  setActiveCampaign: (id: string | null, name?: string | null, icon?: string | null) => void
  expandPanel: (tab?: 'artifacts') => void
  onAgentInfoOpenChange: (open: boolean) => void
  onCampaignPanelOpenChange: (open: boolean) => void
  selectSession: (sessionId: string, hydrate?: boolean) => Promise<void>
  startLocalDraftSession: (campaignIdOverride?: string | null) => void
}

export interface UseAgentChatCampaignControllerResult {
  campaignModelStrategy: string | null
  mobileCampaignSettingsOpen: boolean
  mobileCampaignSubScreen: 'campaign' | 'preview'
  mobilePreviewInfo: MobilePreviewInfo
  mobileCampaignPickerOpen: boolean
  mobileCampaignSwitcherOptions: MobileCampaignSwitcherOption[]
  setMobileCampaignSettingsOpen: Dispatch<SetStateAction<boolean>>
  setMobileCampaignSubScreen: Dispatch<SetStateAction<'campaign' | 'preview'>>
  setMobilePreviewInfo: Dispatch<SetStateAction<MobilePreviewInfo>>
  setMobileCampaignPickerOpen: Dispatch<SetStateAction<boolean>>
  handleAgentHeaderClick: () => void
  handleCampaignHeaderClick: (campaignId: string) => void
  handleSelectCampaignFromMobilePicker: (campaignId: string) => Promise<void>
  handleCampaignPanelToggle: () => void
}

export function useAgentChatCampaignController({
  agentKey,
  selectedSession,
  activeCampaignId,
  generalCampaignId,
  assignedCampaigns = [],
  nonGeneralCampaigns,
  sessions,
  isMobile,
  campaignPanelOpen,
  hideCampaignPanel,
  isPanelMinimized,
  newConversationCampaignScopeRef,
  setActiveCampaign,
  expandPanel,
  onAgentInfoOpenChange,
  onCampaignPanelOpenChange,
  selectSession,
  startLocalDraftSession,
}: UseAgentChatCampaignControllerInput): UseAgentChatCampaignControllerResult {
  const [mobileCampaignSettingsOpen, setMobileCampaignSettingsOpen] = useState(false)
  const [mobileCampaignSubScreen, setMobileCampaignSubScreen] = useState<'campaign' | 'preview'>(
    'campaign',
  )
  const [mobilePreviewInfo, setMobilePreviewInfo] = useState<MobilePreviewInfo>({
    name: '',
    hasSettings: false,
  })
  const [mobileCampaignPickerOpen, setMobileCampaignPickerOpen] = useState(false)
  const [campaignModelStrategy, setCampaignModelStrategy] = useState<string | null>(null)
  const [campaignConfigVersion, setCampaignConfigVersion] = useState(0)

  useEffect(() => {
    const preferred = resolveDefaultNewConversationCampaignId({
      assignedCampaigns,
      cachedCampaignId: newConversationCampaignScopeRef.current,
      generalCampaignId,
    })
    if (!preferred) return
    if (
      !newConversationCampaignScopeRef.current ||
      isGeneralCampaignId(newConversationCampaignScopeRef.current, generalCampaignId)
    ) {
      newConversationCampaignScopeRef.current = preferred
      if (!isGeneralCampaignId(preferred, generalCampaignId)) {
        writeCampaignScope(agentKey, preferred)
      }
    }
  }, [agentKey, assignedCampaigns, generalCampaignId, newConversationCampaignScopeRef])

  useEffect(() => {
    if (!selectedSession) return
    const cid = selectedSession.campaign_id
    if (typeof cid === 'string' && cid.trim().length > 0) {
      // Viewing General must not sticky the next "+ new chat" onto General when
      // the agent is assigned to real campaigns (client brain reads need that scope).
      if (isGeneralCampaignId(cid, generalCampaignId) && assignedCampaigns.length > 0) {
        const preferred = resolveDefaultNewConversationCampaignId({
          assignedCampaigns,
          cachedCampaignId: null,
          generalCampaignId,
        })
        if (preferred) {
          newConversationCampaignScopeRef.current = preferred
          writeCampaignScope(agentKey, preferred)
        }
        return
      }
      newConversationCampaignScopeRef.current = cid
      writeCampaignScope(agentKey, cid)
      return
    }
    if (assignedCampaigns.length > 0) {
      const preferred = resolveDefaultNewConversationCampaignId({
        assignedCampaigns,
        cachedCampaignId: null,
        generalCampaignId,
      })
      if (preferred) {
        newConversationCampaignScopeRef.current = preferred
        writeCampaignScope(agentKey, preferred)
      }
      return
    }
    if (generalCampaignId) {
      newConversationCampaignScopeRef.current = generalCampaignId
      writeCampaignScope(agentKey, generalCampaignId)
    }
  }, [
    selectedSession,
    generalCampaignId,
    assignedCampaigns,
    agentKey,
    newConversationCampaignScopeRef,
  ])

  useEffect(() => {
    if (!activeCampaignId) {
      setActiveCampaign(null)
      return
    }
    const isGeneral = Boolean(generalCampaignId && activeCampaignId === generalCampaignId)
    const match = nonGeneralCampaigns.find((campaign) => campaign.id === activeCampaignId)
    const cfg = (match?.config ?? {}) as Record<string, unknown>
    setActiveCampaign(
      activeCampaignId,
      isGeneral ? 'General' : (match?.name ?? null),
      isGeneral ? null : typeof cfg.icon === 'string' ? cfg.icon : null,
    )
  }, [activeCampaignId, nonGeneralCampaigns, generalCampaignId, setActiveCampaign])

  useEffect(() => {
    if (isPanelMinimized && campaignPanelOpen) {
      onCampaignPanelOpenChange(false)
    }
  }, [isPanelMinimized, campaignPanelOpen, onCampaignPanelOpenChange])

  useEffect(() => {
    if (!campaignPanelOpen) {
      setMobileCampaignSettingsOpen(false)
      setMobileCampaignSubScreen('campaign')
    }
  }, [campaignPanelOpen])

  useEffect(() => {
    if (!isMobile) return
    setMobileCampaignSubScreen('campaign')
  }, [activeCampaignId, isMobile])

  useEffect(() => {
    if (!isMobile) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ name: string; hasSettings: boolean }>).detail
      setMobilePreviewInfo(detail ?? { name: 'Preview', hasSettings: false })
      setMobileCampaignSubScreen('preview')
    }
    window.addEventListener('mobile-artifact-preview', handler)
    return () => window.removeEventListener('mobile-artifact-preview', handler)
  }, [isMobile])

  useEffect(() => {
    const handler = () => setCampaignConfigVersion((version) => version + 1)
    window.addEventListener('campaign-config-updated', handler)
    return () => window.removeEventListener('campaign-config-updated', handler)
  }, [])

  useEffect(() => {
    if (!activeCampaignId) {
      setCampaignModelStrategy(null)
      return
    }
    let cancelled = false
    fetchCampaign(activeCampaignId)
      .then((campaign) => {
        if (cancelled) return
        const config = (campaign.config ?? {}) as Record<string, unknown>
        const agentSettings = (config.agent_settings as Record<string, unknown> | undefined) ?? {}
        const strategy = agentSettings.model_strategy as string | undefined
        setCampaignModelStrategy(strategy && strategy.trim().length > 0 ? strategy : null)
      })
      .catch(() => {
        if (!cancelled) setCampaignModelStrategy(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeCampaignId, campaignConfigVersion])

  useEffect(() => {
    if (!activeCampaignId) return
    const sb = createClient()
    const add = (nodeId: string) => {
      useChatStore.getState().addNewArtifactId(nodeId)
      if (isPanelMinimized) expandPanel('artifacts')
    }

    const channelName = `team-new-artifacts:${activeCampaignId}`
    let ch = sb.channel(channelName)

    ch = ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'funnel_pages' }, (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`page-${id}`)
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sequence_emails' },
        (p) => {
          const id = (p.new as Record<string, unknown>)?.id as string | undefined
          if (id) add(`email-${id}`)
        },
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ad_sets' }, (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`adset-${id}`)
      })

    for (const [table, prefix] of [
      ['ads', 'ad'],
      ['offers', 'offer'],
      ['lead_magnets', 'lm'],
      ['avatars', 'avatar'],
      ['social_posts', 'social-post'],
      ['funnels', 'funnel'],
      ['sequences', 'sequence'],
      ['ad_campaigns', 'adcamp'],
    ] as const) {
      ch = ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `campaign_id=eq.${activeCampaignId}` },
        (p) => {
          const id = (p.new as Record<string, unknown>)?.id as string | undefined
          if (id) add(`${prefix}-${id}`)
        },
      )
    }

    ch = ch.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'offers',
        filter: `campaign_id=eq.${activeCampaignId}`,
      },
      (p) => {
        const id = (p.new as Record<string, unknown>)?.id as string | undefined
        if (id) add(`offer-${id}`)
      },
    )

    const channel = ch.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR')
        console.error('[Realtime] team new-artifacts channel error:', err)
    })
    return () => {
      void sb.removeChannel(channel)
      useChatStore.getState().clearNewArtifactIds()
    }
  }, [activeCampaignId, expandPanel, isPanelMinimized])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        artifactType?: string
        artifactId?: string
        name?: string
      } | null
      if (!detail?.artifactType) return
      if (hideCampaignPanel) return
      if (activeCampaignId) {
        if (detail.artifactId) {
          window.__vibey_pending_artifact_open = {
            kind: 'simple',
            type: detail.artifactType as VibeyPendingArtifactOpenSimpleType,
            id: detail.artifactId,
            name: detail.name ?? 'Artifact',
          }
        }
        onAgentInfoOpenChange(false)
        onCampaignPanelOpenChange(true)
        expandPanel('artifacts')
      }
    }
    window.addEventListener('vibey-open-artifact', handler)
    return () => window.removeEventListener('vibey-open-artifact', handler)
  }, [
    onAgentInfoOpenChange,
    onCampaignPanelOpenChange,
    activeCampaignId,
    expandPanel,
    hideCampaignPanel,
  ])

  const handleAgentHeaderClick = useCallback(() => {
    onAgentInfoOpenChange(true)
    onCampaignPanelOpenChange(false)
  }, [onAgentInfoOpenChange, onCampaignPanelOpenChange])

  const handleCampaignHeaderClick = useCallback(
    (campaignId: string) => {
      const resolvedScope = campaignId === '__general__' ? (generalCampaignId ?? null) : campaignId
      if (typeof resolvedScope === 'string' && resolvedScope.length > 0) {
        newConversationCampaignScopeRef.current = resolvedScope
      }

      if (campaignId === '__general__') {
        if (generalCampaignId) {
          setActiveCampaign(generalCampaignId, 'General', null)
          onAgentInfoOpenChange(false)
          onCampaignPanelOpenChange(true)
          expandPanel()
        }
        return
      }
      const match = nonGeneralCampaigns.find((campaign) => campaign.id === campaignId)
      if (match) {
        const cfg = (match.config ?? {}) as Record<string, unknown>
        setActiveCampaign(
          campaignId,
          match.name ?? null,
          typeof cfg.icon === 'string' ? cfg.icon : null,
        )
      }
      onAgentInfoOpenChange(false)
      onCampaignPanelOpenChange(true)
      expandPanel()
    },
    [
      nonGeneralCampaigns,
      generalCampaignId,
      setActiveCampaign,
      onAgentInfoOpenChange,
      onCampaignPanelOpenChange,
      expandPanel,
      newConversationCampaignScopeRef,
    ],
  )

  const mobileCampaignSwitcherOptions = useMemo(
    () => buildMobileCampaignSwitcherOptions(generalCampaignId, nonGeneralCampaigns),
    [generalCampaignId, nonGeneralCampaigns],
  )

  const handleSelectCampaignFromMobilePicker = useCallback(
    async (campaignId: string) => {
      setMobileCampaignPickerOpen(false)
      if (campaignId === activeCampaignId) return
      const match = findLatestSessionForCampaign(sessions, campaignId, generalCampaignId)
      if (match) {
        await selectSession(match.id, true)
      } else {
        startLocalDraftSession(campaignId)
      }
    },
    [activeCampaignId, sessions, generalCampaignId, selectSession, startLocalDraftSession],
  )

  const handleCampaignPanelToggle = useCallback(() => {
    if (campaignPanelOpen) {
      onCampaignPanelOpenChange(false)
    } else {
      onAgentInfoOpenChange(false)
      onCampaignPanelOpenChange(true)
      expandPanel()
    }
  }, [campaignPanelOpen, onAgentInfoOpenChange, onCampaignPanelOpenChange, expandPanel])

  return {
    campaignModelStrategy,
    mobileCampaignSettingsOpen,
    mobileCampaignSubScreen,
    mobilePreviewInfo,
    mobileCampaignPickerOpen,
    mobileCampaignSwitcherOptions,
    setMobileCampaignSettingsOpen,
    setMobileCampaignSubScreen,
    setMobilePreviewInfo,
    setMobileCampaignPickerOpen,
    handleAgentHeaderClick,
    handleCampaignHeaderClick,
    handleSelectCampaignFromMobilePicker,
    handleCampaignPanelToggle,
  }
}
