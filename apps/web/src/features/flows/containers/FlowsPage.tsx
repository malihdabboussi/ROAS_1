'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { toast } from 'sonner'
import type { AutomationRunDisplayMeta } from '@/components/flows/AutomationRunsLog'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import type { AutomationSolidOption } from '@/components/ui/forms/AutomationSolidSelect'
import { OptionDot } from '@/components/ui/status/OptionDot'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useUserRole } from '@/hooks/use-user-role'
import {
  dispatchTeamHrChatCompose,
  TEAM_HR_CHAT_COMPOSE_EVENT,
  type TeamHrChatComposeDetail,
} from '@/lib/agents/side-chat-compose'
import { readStoredLoopConversationId } from '@/lib/agents/side-chat-storage'
import { fetchDistinctContactSourceValues } from '@/lib/contacts/contacts-api'
import { createNewConversation } from '@/lib/conversations/conversations-api'
import { checkRuleFieldsComplete, isFlowDraftPlaceholder } from '@/lib/flows/automation-publishable'
import { mergeContactsViewsPickerOptions } from '@/lib/flows/contacts-automation-picker-options'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import type { FlowTriggerContextSpace } from '@/lib/flows/flow-trigger-context-space.utils'
import {
  FLOW_USER_TEMPLATE_NAME_PREFIX,
  isUserFlowTemplate,
  userFlowTemplateDisplayName,
} from '@/lib/flows/flow-user-template.utils'
import {
  matchesFlowsConceptSpace,
  persistFlowsCreateAnythingMode,
  readStoredFlowsCreateAnythingMode,
} from '@/lib/flows/flows-scope-storage'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { useAccountContextGate } from '@/lib/org/org-context-store'
import { fetchSpaces, type SpaceFieldDef, type SpaceSummary } from '@/lib/spaces/spaces-api'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team/team-roster-api'
import { FlowClarificationsView } from '../components/FlowClarificationsView'
import { FlowsBrowseHub } from '../components/FlowsBrowseHub'
import { FlowsEditorPanel } from '../components/FlowsEditorPanel'
import { FlowsForbiddenState } from '../components/FlowsForbiddenState'
import { FlowsHistoryView } from '../components/FlowsHistoryView'
import { FlowsManagePanel } from '../components/FlowsManagePanel'
import { FlowsMyTemplatesPanel } from '../components/FlowsMyTemplatesPanel'
import { FlowsWebhooksView } from '../components/FlowsWebhooksView'
import { FlowsShell } from '../components/nav/FlowsShell'
import { useFlowBuildSession } from '../hooks/use-flow-build-session'
import { useFlowBuildSessionsList } from '../hooks/use-flow-build-sessions-list'
import { isFlowCardOpenSuppressed, suppressFlowCardOpen } from '../lib/flow-card-open-suppress'
import {
  isFlowChatDrag,
  readFlowChatDragPayload,
  type FlowChatDragPayload,
} from '../lib/flow-chat-drag'
import {
  FLOW_CLARIFICATION_ANSWER_EVENT,
  submitFlowClarificationAnswers,
  type FlowClarificationAnswerDetail,
} from '../lib/flow-clarification-ui'
import { flowAutomationFieldsForSpace } from '../lib/flow-space-fields'
import { buildTriggerFilterOptions, filterFlows, sortFlows } from '../lib/flows-filters'
import { groupManageFlows } from '../lib/flows-grouping'
import {
  dispatchLoopChatActivateConversation,
  dispatchLoopChatOpenPanel,
  dispatchLoopChatSelectConversation,
  LOOP_CHAT_CONVERSATION_EVENT,
  type LoopChatConversationDetail,
} from '../lib/loop-chat-conversation'
import {
  findBuildSessionForConversation,
  findDraftForBuildSession,
  listOrphanFlowBuildSessions,
  mapFlowDraftBuildLinks,
  resolveFlowDraftBuildLink,
} from '../lib/map-flow-draft-build-links'
import {
  resolveFlowScopeLocations,
  type FlowScopeLocation,
} from '../lib/resolve-flow-scope-locations'
import { syncFlowClarificationsToChat } from '../lib/sync-flow-clarifications-to-chat'
import {
  flowNeedsPlanSync,
  mergeFlowWithBuildPlan,
  syncBuildPlanToDraft,
} from '../lib/sync-flow-plan-to-draft'
import {
  createFlowBuildSession,
  createFlowDraft,
  deleteFlow,
  deleteFlowBuildSession,
  ensureFlowsConceptSpace,
  fetchFlows,
  fetchOrgFlows,
  publishFlow,
  updateFlow,
  updateFlowDraft,
  validateFlowDraft,
  type FlowValidationResult,
} from '../services/flows.service'
import type {
  FlowAutomation,
  FlowAutomationPayload,
  FlowAutomationSummary,
  FlowInstallationSummary,
} from '../types/flow-automation.types'
import type { FlowBuildSessionLink } from '../types/flow-build-session-link.types'
import type {
  FlowsBrowseSection,
  FlowsDraftFilter,
  FlowsEnabledFilter,
  FlowsGroupBy,
  FlowsGroupSort,
  FlowsPanelTab,
  FlowsSort,
  FlowsViewMode,
} from '../types/flows-page.types'

const DEFAULT_TRIGGER = { type: 'choose_action' } as FlowAutomation['trigger']
const DEFAULT_ACTIONS: FlowAutomation['actions'] = []

type FlowLoopUpdateTarget = Pick<FlowAutomationSummary, 'id' | 'name' | 'campaign_id'> & {
  space_id?: string | null
}

function flowMatchesId(flow: FlowAutomationSummary, flowId: string): boolean {
  if (flow.id === flowId || flow.automation_id === flowId) return true
  return !!flow.installations?.some(
    (installation) => installation.id === flowId || installation.automation_id === flowId,
  )
}

function findFlowByAnyId(
  flows: FlowAutomationSummary[],
  flowId: string,
): FlowAutomationSummary | FlowInstallationSummary | null {
  for (const flow of flows) {
    if (flow.id === flowId || flow.automation_id === flowId) return flow
    const installation = flow.installations?.find(
      (row) => row.id === flowId || row.automation_id === flowId,
    )
    if (installation) return installation
  }
  return null
}

function toEditableFlow(flow: FlowAutomationSummary | FlowInstallationSummary): FlowAutomation {
  return {
    ...flow,
    id: flow.automation_id ?? flow.id,
    trigger: flow.trigger as FlowAutomation['trigger'],
    actions: [...flow.actions] as FlowAutomation['actions'],
  }
}

type LoadFlowsOptions = {
  scopeSpaceId?: string | null
  createAnything?: boolean
  preserveFlowId?: string | null
  silent?: boolean
}

function isLoopChatPanelDropTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('[data-team-hr-chat-panel]')
}

export function FlowsPage() {
  const searchParams = useSearchParams()
  const { role, loading: roleLoading } = useUserRole()
  const { activeOrgId, isAccountContextReady } = useAccountContextGate()
  const requestedCampaignId = searchParams.get('campaign_id')
  const requestedSpaceId = searchParams.get('space_id')
  const requestedFlowId = searchParams.get('flow_id')
  const requestedBuildSessionId = searchParams.get('build_session_id')

  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [spacesLoading, setSpacesLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(requestedCampaignId)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(requestedSpaceId)
  const [createAnythingMode, setCreateAnythingMode] = useState(true)
  const [conceptSpaceId, setConceptSpaceId] = useState<string | null>(null)
  const [, setConceptSpaceLoading] = useState(false)
  const [panelTab, setPanelTab] = useState<FlowsPanelTab>('browse')
  const [browseSection, setBrowseSection] = useState<FlowsBrowseSection>('templates')
  const [userTemplateInstallingId, setUserTemplateInstallingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<FlowsViewMode>('list')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [draftFilter, setDraftFilter] = useState<FlowsDraftFilter>('all')
  const [enabledFilter, setEnabledFilter] = useState<FlowsEnabledFilter>('all')
  const [triggerFilter, setTriggerFilter] = useState<string>('all')
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [sort, setSort] = useState<FlowsSort>('recent')
  const [groupBy, setGroupBy] = useState<FlowsGroupBy>('status')
  const [groupSort, setGroupSort] = useState<FlowsGroupSort>('asc')
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set())

  const [flows, setFlows] = useState<FlowAutomation[]>([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(requestedFlowId)
  const [pendingEditorFlow, setPendingEditorFlow] = useState<FlowAutomationSummary | null>(null)
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [contactAutomationSourceValues, setContactAutomationSourceValues] = useState<string[]>([])
  const [validation, setValidation] = useState<FlowValidationResult | null>(null)
  const [validationFlowId, setValidationFlowId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [, setLoopStartGateOpen] = useState(true)
  const [loopConversationId, setLoopConversationId] = useState<string | null>(null)
  const [skipStoredLoopConversationSpaceId, setSkipStoredLoopConversationSpaceId] = useState<
    string | null
  >(null)
  const [pendingLoopFlow, setPendingLoopFlow] = useState<FlowChatDragPayload | null>(null)
  const [pendingLoopConversationSelection, setPendingLoopConversationSelection] = useState<{
    spaceId: string
    conversationId: string
  } | null>(null)
  const [focusedBuildSessionId, setFocusedBuildSessionId] = useState<string | null>(null)
  const [loopBuildPanelPinned, setLoopBuildPanelPinned] = useState(false)
  const [buildDraftFlowId, setBuildDraftFlowId] = useState<string | null>(null)
  const prevActiveBuildSessionIdRef = useRef<string | null>(null)
  const userChosePanelTabRef = useRef(false)
  const selectedFlowIdRef = useRef<string | null>(requestedFlowId)

  useEffect(() => {
    selectedFlowIdRef.current = selectedFlowId
  }, [selectedFlowId])

  const effectiveSpaceId = createAnythingMode ? conceptSpaceId : selectedSpaceId

  useEffect(() => {
    const store = useGlobalChatStore.getState()
    store.setActiveAgentKey('loop')
    store.setWorkContext({ surface: 'flows', spaceId: effectiveSpaceId ?? undefined })
  }, [effectiveSpaceId])

  const selectableSpaces = useMemo(
    () => spaces.filter((space) => !matchesFlowsConceptSpace(space)),
    [spaces],
  )

  const flowInstallations = useMemo(
    () => flows.flatMap((flow) => flow.installations ?? []),
    [flows],
  )

  const selectedFlow = useMemo(() => {
    if (!selectedFlowId) return null
    const flow = flows.find(
      (row) => row.id === selectedFlowId || row.automation_id === selectedFlowId,
    )
    if (flow) return toEditableFlow(flow)
    const installation = flowInstallations.find(
      (row) => row.id === selectedFlowId || row.automation_id === selectedFlowId,
    )
    if (installation) return toEditableFlow(installation)
    if (pendingEditorFlow && flowMatchesId(pendingEditorFlow, selectedFlowId)) {
      return toEditableFlow(pendingEditorFlow)
    }
    return null
  }, [flowInstallations, pendingEditorFlow, selectedFlowId, flows])

  useEffect(() => {
    if (!pendingEditorFlow || !selectedFlowId) return
    if (flows.some((flow) => flowMatchesId(flow, selectedFlowId))) {
      setPendingEditorFlow(null)
    }
  }, [flows, pendingEditorFlow, selectedFlowId])

  const scopeSpace = useMemo(() => {
    const scopeSpaceId = effectiveSpaceId ?? selectedFlow?.space_id ?? null
    return spaces.find((space) => space.id === scopeSpaceId) ?? null
  }, [effectiveSpaceId, selectedFlow?.space_id, spaces])

  const editorSpaceId = selectedFlow?.space_id ?? effectiveSpaceId
  const buildSessionScopeSpaceId =
    (createAnythingMode ? (conceptSpaceId ?? selectedFlow?.space_id ?? null) : null) ??
    effectiveSpaceId ??
    selectedFlow?.space_id ??
    null

  const {
    summary: flowBuildSummary,
    session: flowBuildSession,
    plan: flowBuildPlan,
    refresh: refreshFlowBuildSession,
  } = useFlowBuildSession(
    role === 'admin' ? buildSessionScopeSpaceId : null,
    role === 'admin' && !focusedBuildSessionId ? loopConversationId : null,
    role === 'admin' ? focusedBuildSessionId : null,
  )

  const { sessions: flowBuildSessionLinks, refresh: refreshFlowBuildSessionLinks } =
    useFlowBuildSessionsList(role === 'admin' ? buildSessionScopeSpaceId : null)

  const buildPreviewFlow = useMemo(() => {
    const automationId = flowBuildPlan?.automation_id
    if (!automationId) return null
    const flow = findFlowByAnyId(flows, automationId)
    return flow ? toEditableFlow(flow) : null
  }, [flowBuildPlan?.automation_id, flows])

  useEffect(() => {
    setBuildDraftFlowId(buildPreviewFlow?.id ?? flowBuildPlan?.automation_id ?? null)
  }, [buildPreviewFlow?.id, flowBuildPlan?.automation_id])

  const editorFlow = useMemo(() => {
    if (!selectedFlow) return null
    if (!flowBuildPlan) return selectedFlow
    return mergeFlowWithBuildPlan(selectedFlow, flowBuildPlan)
  }, [flowBuildPlan, selectedFlow])

  const showFlowScopeMeta = !createAnythingMode && !selectedSpaceId
  const canPublish = useMemo(() => {
    if (!selectedFlow) return false
    const local = checkRuleFieldsComplete(
      selectedFlow.name,
      selectedFlow.trigger,
      selectedFlow.actions,
    )
    if (validationFlowId === selectedFlow.id && validation) {
      return validation.valid
    }
    return local.ok
  }, [selectedFlow, validation, validationFlowId])
  const activeBuildSessionId = typeof flowBuildSession?.id === 'string' ? flowBuildSession.id : null
  const openBuildClarifications = useMemo(
    () => flowBuildSummary?.clarifications?.filter((row) => row.status === 'open') ?? [],
    [flowBuildSummary?.clarifications],
  )
  const showClarificationsTab = openBuildClarifications.length >= 4

  const shellFlowName = editorFlow?.name ?? buildPreviewFlow?.name ?? flowBuildPlan?.name ?? null

  const isFlowEditorOpen = Boolean(
    panelTab === 'browse' &&
    browseSection === 'my-loops' &&
    selectedFlowId &&
    editorFlow &&
    editorSpaceId,
  )

  const editorFlowScopeLocations = useMemo(() => {
    if (!editorFlow || !isFlowEditorOpen) return null
    return resolveFlowScopeLocations(editorFlow, spaces)
  }, [editorFlow, isFlowEditorOpen, spaces])

  const handleNavigateToFlowLocation = useCallback((location: FlowScopeLocation) => {
    if (location.isConceptSandbox) {
      setCreateAnythingMode(true)
      persistFlowsCreateAnythingMode(true)
      if (location.spaceId) setConceptSpaceId(location.spaceId)
      setSelectedSpaceId(null)
      setSelectedCampaignId(null)
      return
    }
    setCreateAnythingMode(false)
    persistFlowsCreateAnythingMode(false)
    if (location.campaignId) setSelectedCampaignId(location.campaignId)
    if (location.spaceId) setSelectedSpaceId(location.spaceId)
  }, [])

  useEffect(() => {
    if (requestedSpaceId) {
      setCreateAnythingMode(false)
      persistFlowsCreateAnythingMode(false)
      return
    }
    setCreateAnythingMode(readStoredFlowsCreateAnythingMode())
  }, [requestedSpaceId])

  const conceptSpacePromiseRef = useRef<Promise<string | null> | null>(null)

  const ensureConceptSpaceReady = useCallback(
    async (options?: { notifyOnError?: boolean }): Promise<string | null> => {
      if (conceptSpaceId) return conceptSpaceId
      const existing = spaces.find((space) => matchesFlowsConceptSpace(space))
      if (existing) {
        setConceptSpaceId(existing.id)
        return existing.id
      }
      if (conceptSpacePromiseRef.current) return conceptSpacePromiseRef.current

      const promise = (async () => {
        setConceptSpaceLoading(true)
        try {
          const result = await ensureFlowsConceptSpace()
          setConceptSpaceId(result.space_id)
          const rows = await fetchSpaces({ limit: 100 })
          setSpaces(rows)
          return result.space_id
        } catch {
          if (options?.notifyOnError) {
            toast.error('Could not open the Flow sandbox. Check your connection and refresh.')
          }
          return null
        } finally {
          setConceptSpaceLoading(false)
        }
      })()

      conceptSpacePromiseRef.current = promise
      try {
        return await promise
      } finally {
        conceptSpacePromiseRef.current = null
      }
    },
    [conceptSpaceId, spaces],
  )

  useEffect(() => {
    if (!createAnythingMode || conceptSpaceId) return
    const existing = spaces.find((space) => matchesFlowsConceptSpace(space))
    if (existing) setConceptSpaceId(existing.id)
  }, [conceptSpaceId, createAnythingMode, spaces])

  useEffect(() => {
    if (role !== 'admin' || !createAnythingMode || conceptSpaceId) return
    void ensureConceptSpaceReady()
  }, [conceptSpaceId, createAnythingMode, ensureConceptSpaceReady, role])

  useEffect(() => {
    if (!effectiveSpaceId) {
      setLoopConversationId(null)
      return
    }
    if (skipStoredLoopConversationSpaceId === effectiveSpaceId) {
      setLoopConversationId(null)
      setSkipStoredLoopConversationSpaceId(null)
      return
    }
    setLoopConversationId(readStoredLoopConversationId(effectiveSpaceId))
  }, [effectiveSpaceId, skipStoredLoopConversationSpaceId])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoopChatConversationDetail>).detail
      if (!detail || detail.spaceId !== effectiveSpaceId) return
      setLoopConversationId(detail.conversationId)
      setFocusedBuildSessionId((current) => {
        if (!current || !detail.conversationId) return current
        const session = flowBuildSessionLinks.find((row) => row.id === current)
        if (!session?.conversation_id) return current
        return session.conversation_id === detail.conversationId ? current : null
      })
      void refreshFlowBuildSession()
      void refreshFlowBuildSessionLinks()
    }
    window.addEventListener(LOOP_CHAT_CONVERSATION_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_CONVERSATION_EVENT, handler)
  }, [
    effectiveSpaceId,
    flowBuildSessionLinks,
    refreshFlowBuildSession,
    refreshFlowBuildSessionLinks,
  ])

  useEffect(() => {
    if (!pendingLoopConversationSelection) return
    if (pendingLoopConversationSelection.spaceId !== effectiveSpaceId) return
    dispatchLoopChatSelectConversation(pendingLoopConversationSelection)
    setPendingLoopConversationSelection(null)
  }, [effectiveSpaceId, pendingLoopConversationSelection])

  useEffect(() => {
    if (showClarificationsTab) {
      if (panelTab !== 'clarifications') setPanelTab('clarifications')
      return
    }
    if (panelTab === 'clarifications') {
      setPanelTab('browse')
      setBrowseSection('my-loops')
    }
  }, [panelTab, showClarificationsTab])

  useEffect(() => {
    if (panelTab === 'webhooks') {
      setPanelTab('browse')
      setBrowseSection('webhooks')
    }
    if (panelTab === 'build') {
      setPanelTab('browse')
      setBrowseSection('my-loops')
      if (buildDraftFlowId) setSelectedFlowId(buildDraftFlowId)
    }
  }, [panelTab, buildDraftFlowId])

  useEffect(() => {
    const previousSessionId = prevActiveBuildSessionIdRef.current
    prevActiveBuildSessionIdRef.current = activeBuildSessionId
    if (!activeBuildSessionId || showClarificationsTab) return
    setLoopBuildPanelPinned(true)
    if (!previousSessionId && activeBuildSessionId && !userChosePanelTabRef.current) {
      setPanelTab('browse')
      setBrowseSection('my-loops')
    }
  }, [activeBuildSessionId, showClarificationsTab])

  useEffect(() => {
    if (!createAnythingMode) {
      setLoopBuildPanelPinned(false)
      return
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TeamHrChatComposeDetail>).detail
      if (!detail?.submit) return
      setLoopBuildPanelPinned(true)
      userChosePanelTabRef.current = false
      if (!showClarificationsTab) {
        setPanelTab('browse')
        setBrowseSection('my-loops')
      }
    }
    window.addEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
    return () => window.removeEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
  }, [createAnythingMode, showClarificationsTab])

  const handleSelectPanelTab = useCallback((tab: FlowsPanelTab) => {
    userChosePanelTabRef.current = true
    setPanelTab(tab)
  }, [])

  const openBrowseSection = useCallback((section: FlowsBrowseSection) => {
    setBrowseSection(section)
    userChosePanelTabRef.current = true
    setPanelTab('browse')
  }, [])

  const handleBrowseSectionChange = useCallback((section: FlowsBrowseSection) => {
    if (section !== 'my-loops') {
      setSelectedFlowId(null)
      setValidation(null)
      setValidationFlowId(null)
    }
    setBrowseSection(section)
  }, [])

  useEffect(() => {
    if (!effectiveSpaceId) {
      setLoopStartGateOpen(false)
      return
    }
    if (createAnythingMode) {
      setLoopStartGateOpen(false)
      return
    }
    if (pendingLoopFlow) {
      setLoopStartGateOpen(false)
      return
    }
    if (activeBuildSessionId) {
      setLoopStartGateOpen(false)
      return
    }
    setLoopStartGateOpen(true)
  }, [activeBuildSessionId, createAnythingMode, effectiveSpaceId, pendingLoopFlow])

  const handleAskLoopToFix = useCallback((prompt: string) => {
    setLoopStartGateOpen(false)
    dispatchTeamHrChatCompose({ text: prompt, submit: true })
  }, [])

  const fieldsForAutomations = useMemo(
    (): SpaceFieldDef[] => flowAutomationFieldsForSpace(scopeSpace?.schema ?? null),
    [scopeSpace?.schema],
  )

  const triggerContextSpaces = useMemo(
    (): FlowTriggerContextSpace[] =>
      selectableSpaces.map((space) => ({
        id: space.id,
        title: space.title,
        campaign_id: space.campaign_id,
        schema: space.schema,
      })),
    [selectableSpaces],
  )

  const editorFlowSpaceIsConceptSandbox = useMemo(() => {
    const editorSpace = spaces.find((space) => space.id === editorSpaceId) ?? null
    return editorSpace ? matchesFlowsConceptSpace(editorSpace) : createAnythingMode
  }, [createAnythingMode, editorSpaceId, spaces])

  const contactsTriggerPickers = useMemo((): ContactsTriggerPickers => {
    const views = scopeSpace?.schema?.views ?? []
    const { tagOptions, typeOptions } = mergeContactsViewsPickerOptions(views)
    const toSolid = (opts: typeof tagOptions): AutomationSolidOption[] =>
      opts.map((o) => ({
        value: o.id,
        label: o.label,
        leading: o.color ? <OptionDot color={o.color} size="sm" /> : undefined,
      }))
    return {
      tagOptions: [{ value: '', label: 'Any tag' }, ...toSolid(tagOptions)],
      typeOptions: [{ value: '', label: 'Any type' }, ...toSolid(typeOptions)],
      sourceOptions: [
        { value: '', label: 'Any source' },
        ...contactAutomationSourceValues.map((s) => ({ value: s, label: s })),
      ],
    }
  }, [contactAutomationSourceValues, scopeSpace?.schema?.views])

  const loadFlows = useCallback(
    async (options?: LoadFlowsOptions): Promise<FlowAutomationSummary[]> => {
      const useCreateAnything = options?.createAnything ?? createAnythingMode
      const scopeSpaceId =
        options?.scopeSpaceId !== undefined
          ? options.scopeSpaceId
          : useCreateAnything
            ? conceptSpaceId
            : selectedSpaceId

      if (!options?.silent) setFlowsLoading(true)
      try {
        const rows = scopeSpaceId
          ? await fetchFlows(scopeSpaceId)
          : useCreateAnything
            ? []
            : await fetchOrgFlows({
                campaignId: selectedCampaignId,
                spaceId: null,
              })
        setFlows(rows)
        setSelectedFlowId((current) => {
          const preserveId = options?.preserveFlowId ?? null
          if (requestedFlowId && rows.some((flow) => flowMatchesId(flow, requestedFlowId))) {
            return requestedFlowId
          }
          if (preserveId && rows.some((flow) => flowMatchesId(flow, preserveId))) {
            return preserveId
          }
          if (current && rows.some((flow) => flowMatchesId(flow, current))) return current
          if (preserveId) return preserveId
          if (current) return current
          return null
        })
        return rows
      } catch {
        toast.error('Could not load flows')
        return []
      } finally {
        if (!options?.silent) setFlowsLoading(false)
      }
    },
    [conceptSpaceId, createAnythingMode, requestedFlowId, selectedCampaignId, selectedSpaceId],
  )

  useEffect(() => {
    if (!flowBuildSummary || !selectedFlow || !flowBuildPlan) return
    if (!flowNeedsPlanSync(selectedFlow, flowBuildPlan)) return

    let cancelled = false
    void (async () => {
      const syncedAutomationId = await syncBuildPlanToDraft({
        summary: flowBuildSummary,
        flow: selectedFlow,
        fallbackSpaceId: effectiveSpaceId,
      })
      if (cancelled || !syncedAutomationId) return
      await loadFlows({ preserveFlowId: syncedAutomationId })
      userChosePanelTabRef.current = false
      setSelectedFlowId(syncedAutomationId)
      setBuildDraftFlowId(syncedAutomationId)
    })()

    return () => {
      cancelled = true
    }
  }, [effectiveSpaceId, flowBuildPlan, flowBuildSummary, loadFlows, selectedFlow])

  useEffect(() => {
    if (!requestedBuildSessionId || role !== 'admin') return
    setFocusedBuildSessionId(requestedBuildSessionId)
    userChosePanelTabRef.current = false
    setPanelTab('browse')
    setBrowseSection('my-loops')
  }, [requestedBuildSessionId, role])

  useEffect(() => {
    if (role !== 'admin') return
    let cancelled = false
    const loadSpaces = async () => {
      setSpacesLoading(true)
      try {
        const rows = await fetchSpaces({ limit: 100 })
        if (cancelled) return
        setSpaces(rows)
        setSelectedSpaceId((current) => {
          if (requestedSpaceId && rows.some((space) => space.id === requestedSpaceId)) {
            return requestedSpaceId
          }
          if (current && rows.some((space) => space.id === current)) return current
          return current
        })
      } finally {
        if (!cancelled) setSpacesLoading(false)
      }
    }
    void loadSpaces()
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (role !== 'admin' || !isAccountContextReady) return
    void loadFlows({ preserveFlowId: selectedFlowIdRef.current })
  }, [
    activeOrgId,
    createAnythingMode,
    conceptSpaceId,
    effectiveSpaceId,
    isAccountContextReady,
    loadFlows,
    role,
    selectedCampaignId,
    selectedSpaceId,
  ])

  useEffect(() => {
    if (role !== 'admin') return
    let cancelled = false
    void fetchTeamRoster({ kind: 'all' }).then((entries) => {
      if (!cancelled) setRoster(entries)
    })
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (!effectiveSpaceId || role !== 'admin') return
    let cancelled = false
    void fetchDistinctContactSourceValues().then((values) => {
      if (!cancelled) setContactAutomationSourceValues(values)
    })
    return () => {
      cancelled = true
    }
  }, [effectiveSpaceId, role])

  useEffect(() => {
    setCollapsedGroupKeys(new Set())
  }, [createAnythingMode, groupBy, groupSort, selectedCampaignId, selectedSpaceId])

  useEffect(() => {
    if (!editorSpaceId || !selectedFlow) {
      setValidation(null)
      setValidationFlowId(null)
      return
    }

    if (isFlowDraftPlaceholder(selectedFlow.trigger, selectedFlow.actions)) {
      setValidation(null)
      setValidationFlowId(null)
      return
    }

    let cancelled = false
    const flowId = selectedFlow.id

    void validateFlowDraft(editorSpaceId, selectedFlow)
      .then((result) => {
        if (cancelled) return
        setValidation(result)
        setValidationFlowId(flowId)
      })
      .catch(() => {
        if (cancelled) return
        setValidation(null)
        setValidationFlowId(null)
      })

    return () => {
      cancelled = true
    }
  }, [editorSpaceId, selectedFlow])

  const handleSelectCampaign = useCallback(
    (campaignId: string | null) => {
      setSelectedCampaignId(campaignId)
      setSelectedFlowId(null)
      setPendingLoopFlow(null)
      setSelectedSpaceId((current) => {
        if (!campaignId || !current) return current
        const space = spaces.find((row) => row.id === current)
        if (space?.campaign_id === campaignId) return current
        return null
      })
    },
    [spaces],
  )

  const handleSelectSpace = useCallback(
    (spaceId: string | null) => {
      if (spaceId) {
        setCreateAnythingMode(false)
        persistFlowsCreateAnythingMode(false)
      }
      setSelectedSpaceId(spaceId)
      setSelectedFlowId(null)
      setPendingLoopFlow(null)
      if (spaceId) {
        const space = spaces.find((row) => row.id === spaceId)
        if (space?.campaign_id) setSelectedCampaignId(space.campaign_id)
      }
    },
    [spaces],
  )

  const triggerFilterOptions = useMemo(() => buildTriggerFilterOptions(flows), [flows])

  const filteredFlows = useMemo(
    () =>
      filterFlows(sortFlows(flows, sort), {
        search,
        draftFilter,
        enabledFilter,
        triggerFilter,
        incompleteOnly,
      }),
    [draftFilter, enabledFilter, flows, incompleteOnly, search, sort, triggerFilter],
  )

  const manageFilteredFlows = useMemo(
    () => filteredFlows.filter((flow) => !isUserFlowTemplate(flow)),
    [filteredFlows],
  )

  const userTemplateFlows = useMemo(() => flows.filter(isUserFlowTemplate), [flows])

  const manageFlows = useMemo(() => flows.filter((flow) => !isUserFlowTemplate(flow)), [flows])

  const draftFlows = useMemo(
    () => manageFilteredFlows.filter((flow) => flow.is_draft),
    [manageFilteredFlows],
  )

  const draftBuildLinks = useMemo(
    () => mapFlowDraftBuildLinks(draftFlows, flowBuildSessionLinks),
    [draftFlows, flowBuildSessionLinks],
  )

  useEffect(() => {
    if (!loopConversationId) return
    const session = findBuildSessionForConversation(loopConversationId, flowBuildSessionLinks)
    if (!session) return
    setFocusedBuildSessionId((current) => (current === session.id ? current : session.id))
  }, [flowBuildSessionLinks, loopConversationId])

  const openFlowWorkspace = useCallback(
    async (input: {
      flowId?: string | null
      flowHint?: FlowAutomationSummary | null
      sessionId?: string | null
      conversationId?: string | null
      spaceId?: string | null
      ensureBuildSession?: boolean
      newLoopConversation?: boolean
      bypassOpenSuppress?: boolean
    }) => {
      if (input.flowId && !input.bypassOpenSuppress && isFlowCardOpenSuppressed(input.flowId))
        return

      userChosePanelTabRef.current = false
      setLoopStartGateOpen(false)
      setLoopBuildPanelPinned(true)
      openBrowseSection('my-loops')

      let flowId = input.flowId ?? null
      const sessionFromInput = input.sessionId
        ? (flowBuildSessionLinks.find((row) => row.id === input.sessionId) ?? null)
        : null

      let spaceId =
        input.spaceId ?? sessionFromInput?.space_id ?? input.flowHint?.space_id ?? effectiveSpaceId
      const linkedSpace = spaceId ? spaces.find((row) => row.id === spaceId) : null
      const linkedConceptSpace = linkedSpace ? matchesFlowsConceptSpace(linkedSpace) : false

      if (linkedSpace) {
        if (linkedConceptSpace) {
          setCreateAnythingMode(true)
          persistFlowsCreateAnythingMode(true)
          setConceptSpaceId(linkedSpace.id)
          setSelectedSpaceId(null)
          setSelectedCampaignId(null)
        } else {
          setCreateAnythingMode(false)
          persistFlowsCreateAnythingMode(false)
          if (linkedSpace.campaign_id) setSelectedCampaignId(linkedSpace.campaign_id)
          setSelectedSpaceId(linkedSpace.id)
        }
      } else if (!spaceId && createAnythingMode) {
        spaceId = await ensureConceptSpaceReady()
      }

      if (!flowId && sessionFromInput) {
        const matchedDraft = findDraftForBuildSession(sessionFromInput, draftFlows)
        if (matchedDraft) flowId = matchedDraft.id
      }

      if (!flowId) {
        toast.error('No Loop draft is linked yet. Ask Loop to compile the plan, then try again.')
        return
      }

      selectedFlowIdRef.current = flowId
      setSelectedFlowId(flowId)
      setBuildDraftFlowId(flowId)

      let sessionId = input.newLoopConversation ? null : (input.sessionId ?? null)
      let conversationId = input.newLoopConversation ? null : (input.conversationId ?? null)
      let activatedConversation: Awaited<ReturnType<typeof createNewConversation>> | null = null

      const rows = await loadFlows({
        scopeSpaceId: spaceId,
        preserveFlowId: flowId,
      })

      let draftRows = rows.filter((row) => row.is_draft && !isUserFlowTemplate(row))

      let flow = input.flowHint ?? (flowId ? findFlowByAnyId(rows, flowId) : null)

      if (flowId && !flow) {
        const candidateSpaceIds = [
          spaceId,
          sessionFromInput?.space_id,
          input.spaceId,
          conceptSpaceId,
        ].filter((value): value is string => typeof value === 'string' && value.length > 0)
        const seenSpaceIds = new Set<string>()
        for (const candidateSpaceId of candidateSpaceIds) {
          if (seenSpaceIds.has(candidateSpaceId)) continue
          seenSpaceIds.add(candidateSpaceId)
          const scopedRows = await loadFlows({
            scopeSpaceId: candidateSpaceId,
            preserveFlowId: flowId,
            silent: true,
          })
          const candidateFlow = findFlowByAnyId(scopedRows, flowId)
          if (!candidateFlow) continue
          flow = candidateFlow
          draftRows = scopedRows.filter((row) => row.is_draft && !isUserFlowTemplate(row))
          spaceId = candidateSpaceId
          break
        }
      }

      if (!spaceId) {
        spaceId = flow?.space_id ?? sessionFromInput?.space_id ?? null
      }

      if (flowId && !spaceId) {
        toast.error('Could not resolve a space for this flow. Pick a space and try again.')
        return
      }

      if (!flow && sessionFromInput) {
        flow = findDraftForBuildSession(sessionFromInput, draftRows)
      }
      if (!flow && flowId) {
        flow = findFlowByAnyId(draftFlows, flowId) ?? findFlowByAnyId(manageFlows, flowId)
      }

      if (flow && 'is_draft' in flow) {
        setPendingEditorFlow(flow as FlowAutomationSummary)
      }

      if (!input.newLoopConversation) {
        const draftForLink =
          draftRows.find((draft) => flowMatchesId(draft, flowId)) ??
          (flow && 'is_draft' in flow && flow.is_draft ? (flow as FlowAutomationSummary) : null)
        if (draftForLink) {
          const link = resolveFlowDraftBuildLink(draftForLink, flowBuildSessionLinks, draftRows)
          sessionId = sessionId ?? link.sessionId ?? null
          conversationId = conversationId ?? link.conversationId ?? null
        }
      }

      if (!sessionId && sessionFromInput) {
        sessionId = sessionFromInput.id
        conversationId = conversationId ?? sessionFromInput.conversation_id ?? null
      }

      if (!conversationId && loopConversationId && !input.newLoopConversation && flowId) {
        const activeSession = findBuildSessionForConversation(
          loopConversationId,
          flowBuildSessionLinks,
        )
        if (activeSession) {
          const identityKeys = new Set<string>([flowId])
          if (flow?.id) identityKeys.add(flow.id)
          if (flow && 'automation_id' in flow && typeof flow.automation_id === 'string') {
            identityKeys.add(flow.automation_id)
          }
          const sessionBelongsToFlow =
            (activeSession.automation_id != null &&
              identityKeys.has(activeSession.automation_id)) ||
            (activeSession.target_automation_id != null &&
              identityKeys.has(activeSession.target_automation_id))
          if (sessionBelongsToFlow) {
            conversationId = loopConversationId
            sessionId = sessionId ?? activeSession.id
          }
        }
      }

      if (
        input.newLoopConversation &&
        !conversationId &&
        !input.ensureBuildSession &&
        spaceId &&
        flow
      ) {
        try {
          const conversation = await createNewConversation({
            agent_id: 'loop',
            title: flow.name,
          })
          activatedConversation = conversation
          conversationId = conversation.id
        } catch {
          // Editor should still open when Loop chat fails to start.
        }
      }

      if (input.ensureBuildSession && flowId && spaceId && !sessionId) {
        const targetFlow =
          flow ??
          (flowId ? findFlowByAnyId(rows, flowId) : null) ??
          findFlowByAnyId(draftFlows, flowId)
        if (targetFlow) {
          try {
            let conversationForSession = conversationId
            if (input.newLoopConversation || !conversationForSession) {
              const conversation = await createNewConversation({
                agent_id: 'loop',
                title: targetFlow.name,
              })
              activatedConversation = conversation
              conversationForSession = conversation.id
            }

            const summary = await createFlowBuildSession(spaceId, {
              intent: `Work on flow: ${targetFlow.name}`,
              name: targetFlow.name,
              mode: 'update',
              target_automation_id: targetFlow.id,
              conversation_id: conversationForSession,
            })
            const session = summary.session as { id?: string; conversation_id?: string | null }
            if (typeof session.id === 'string') sessionId = session.id
            if (typeof session.conversation_id === 'string') {
              conversationId = session.conversation_id
            } else if (conversationForSession) {
              conversationId = conversationForSession
            }
            await refreshFlowBuildSessionLinks()
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Could not connect Loop to this flow'
            toast.error(message)
          }
        }
      } else if (input.ensureBuildSession && flowId && spaceId && sessionId && !conversationId) {
        const targetFlow =
          flow ??
          (flowId ? findFlowByAnyId(rows, flowId) : null) ??
          findFlowByAnyId(draftFlows, flowId)
        if (targetFlow) {
          try {
            let conversationForSession = loopConversationId
            if (!conversationForSession) {
              const conversation = await createNewConversation({
                agent_id: 'loop',
                title: targetFlow.name,
              })
              activatedConversation = conversation
              conversationForSession = conversation.id
            }
            conversationId = conversationForSession
            const summary = await createFlowBuildSession(spaceId, {
              intent: `Work on flow: ${targetFlow.name}`,
              name: targetFlow.name,
              mode: 'update',
              target_automation_id: targetFlow.id,
              conversation_id: conversationForSession,
            })
            const session = summary.session as { id?: string; conversation_id?: string | null }
            if (typeof session.id === 'string') sessionId = session.id
            if (typeof session.conversation_id === 'string') {
              conversationId = session.conversation_id
            }
            await refreshFlowBuildSessionLinks()
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Could not connect Loop to this flow'
            toast.error(message)
          }
        }
      }

      setFocusedBuildSessionId(sessionId)

      if (conversationId && spaceId) {
        setLoopConversationId(conversationId)
        if (activatedConversation) {
          dispatchLoopChatActivateConversation({ spaceId, conversation: activatedConversation })
        } else {
          dispatchLoopChatSelectConversation({ spaceId, conversationId })
        }
        setPendingLoopConversationSelection({ spaceId, conversationId })
        dispatchLoopChatOpenPanel()
      } else if (input.ensureBuildSession || sessionId) {
        dispatchLoopChatOpenPanel()
      }

      userChosePanelTabRef.current = false
      setPanelTab('browse')
      setBrowseSection('my-loops')

      if (sessionId && spaceId) {
        const summary = await refreshFlowBuildSession()
        if (summary && flowId) {
          try {
            const linkedFlow = findFlowByAnyId(rows, flowId)
            await syncBuildPlanToDraft({
              summary,
              flow: linkedFlow,
              fallbackSpaceId: spaceId,
            })
            await loadFlows({
              scopeSpaceId: spaceId,
              preserveFlowId: flowId,
              silent: true,
            })
          } catch {
            // Plan sync is best-effort when opening — editor should still open.
          }
        }
      }
    },
    [
      conceptSpaceId,
      createAnythingMode,
      draftFlows,
      effectiveSpaceId,
      ensureConceptSpaceReady,
      flowBuildSessionLinks,
      loadFlows,
      loopConversationId,
      manageFlows,
      openBrowseSection,
      refreshFlowBuildSession,
      refreshFlowBuildSessionLinks,
      spaces,
    ],
  )

  useEffect(() => {
    if (!loopBuildPanelPinned) return
    dispatchLoopChatOpenPanel()
  }, [loopBuildPanelPinned])

  useEffect(() => {
    if (!loopConversationId || openBuildClarifications.length === 0) return
    if (openBuildClarifications.length > 3) return
    void syncFlowClarificationsToChat(loopConversationId, openBuildClarifications)
  }, [loopConversationId, openBuildClarifications])

  useEffect(() => {
    if (!effectiveSpaceId || !activeBuildSessionId) return

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<FlowClarificationAnswerDetail>).detail
      if (!detail?.questions?.length) return
      void submitFlowClarificationAnswers({
        spaceId: effectiveSpaceId,
        sessionId: activeBuildSessionId,
        questions: detail.questions,
        answers: detail.answers,
      }).then(() => refreshFlowBuildSession())
    }

    window.addEventListener(FLOW_CLARIFICATION_ANSWER_EVENT, handler)
    return () => window.removeEventListener(FLOW_CLARIFICATION_ANSWER_EVENT, handler)
  }, [activeBuildSessionId, effectiveSpaceId, refreshFlowBuildSession])

  const orphanBuildSessions = useMemo(() => {
    if (draftFilter === 'published') return []
    const orphans = listOrphanFlowBuildSessions(draftFlows, flowBuildSessionLinks, manageFlows)
    const q = search.trim().toLowerCase()
    if (!q) return orphans
    return orphans.filter((session) =>
      (session.plan_name?.trim() || 'New flow build').toLowerCase().includes(q),
    )
  }, [draftFilter, draftFlows, flowBuildSessionLinks, manageFlows, search])

  const spaceTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const space of spaces) map.set(space.id, space.title)
    for (const flow of manageFilteredFlows) {
      if (flow.space_id && flow.space_title && !map.has(flow.space_id)) {
        map.set(flow.space_id, flow.space_title)
      }
    }
    return map
  }, [manageFilteredFlows, spaces])

  const flowGroups = useMemo(
    () =>
      groupManageFlows(
        manageFilteredFlows,
        orphanBuildSessions,
        groupBy,
        groupSort,
        spaceTitleById,
      ),
    [manageFilteredFlows, groupBy, groupSort, orphanBuildSessions, spaceTitleById],
  )

  const automationNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const flow of flows) {
      map[flow.id] = flow.name
      if (flow.automation_id) map[flow.automation_id] = flow.name
      for (const installation of flow.installations ?? []) {
        map[installation.id] = installation.name
        if (installation.automation_id) map[installation.automation_id] = installation.name
      }
    }
    return map
  }, [flows])

  const runAutomationMeta = useMemo(() => {
    const map: Record<string, AutomationRunDisplayMeta> = {}
    for (const flow of flows) {
      const flowMeta = {
        flowName: flow.name,
        campaignName: flow.campaign_name ?? null,
        spaceName: flow.space_title ?? null,
      }
      map[flow.id] = flowMeta
      if (flow.automation_id) {
        map[flow.automation_id] = flowMeta
      }
      for (const installation of flow.installations ?? []) {
        const meta = {
          flowName: installation.name,
          campaignName: installation.campaign_name ?? null,
          spaceName: installation.space_title ?? null,
        }
        map[installation.id] = meta
        if (installation.automation_id) map[installation.automation_id] = meta
      }
    }
    return map
  }, [flows])

  const runSpaceMeta = useMemo(() => {
    const campaignNameById = new Map<string, string>()
    for (const flow of flows) {
      if (flow.campaign_id && flow.campaign_name) {
        campaignNameById.set(flow.campaign_id, flow.campaign_name)
      }
    }
    const map: Record<string, AutomationRunDisplayMeta> = {}
    for (const space of spaces) {
      map[space.id] = {
        spaceName: space.title,
        campaignName: space.campaign_id ? (campaignNameById.get(space.campaign_id) ?? null) : null,
      }
    }
    return map
  }, [flows, spaces])

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }, [])

  const openFlowFromList = useCallback(
    (flowId: string) => {
      if (isFlowCardOpenSuppressed(flowId)) return
      const flow = findFlowByAnyId(flows, flowId)
      if (!flow) return

      const summary = flow as FlowAutomationSummary
      const link = draftBuildLinks.get(summary.id)
      const linkedSession =
        flowBuildSessionLinks.find(
          (session) =>
            (session.automation_id != null &&
              (session.automation_id === summary.id ||
                session.automation_id === summary.automation_id)) ||
            (session.target_automation_id != null &&
              (session.target_automation_id === summary.id ||
                session.target_automation_id === summary.automation_id)),
        ) ?? null

      void openFlowWorkspace({
        flowId: summary.automation_id ?? summary.id,
        flowHint: summary,
        spaceId: summary.space_id ?? null,
        sessionId: link?.sessionId ?? linkedSession?.id ?? null,
        conversationId: link?.conversationId ?? linkedSession?.conversation_id ?? null,
        ensureBuildSession: !(link?.sessionId ?? linkedSession?.id),
        bypassOpenSuppress: true,
      })
    },
    [draftBuildLinks, flowBuildSessionLinks, flows, openFlowWorkspace],
  )

  const handleOpenDraftPlan = useCallback(
    (flowId: string, sessionId: string) => {
      const link = draftBuildLinks.get(flowId)
      void openFlowWorkspace({
        flowId,
        sessionId,
        conversationId: link?.conversationId ?? null,
      })
    },
    [draftBuildLinks, openFlowWorkspace],
  )

  const handleOpenDraftFlow = useCallback(
    (flowId: string) => {
      openFlowFromList(flowId)
    },
    [openFlowFromList],
  )

  const handleSelectFlow = useCallback(
    (flowId: string) => {
      openFlowFromList(flowId)
    },
    [openFlowFromList],
  )

  const handleOpenDraftSession = useCallback(
    (flowId: string, conversationId: string) => {
      const flow = findFlowByAnyId(flows, flowId)
      const spaceId = flow?.space_id ?? effectiveSpaceId
      if (!spaceId) return
      void openFlowWorkspace({ flowId, conversationId, spaceId })
    },
    [effectiveSpaceId, flows, openFlowWorkspace],
  )

  const handleOpenBuildSession = useCallback(
    (session: FlowBuildSessionLink) => {
      const matchedDraft = findDraftForBuildSession(session, draftFlows)
      void openFlowWorkspace({
        flowId: session.automation_id ?? session.target_automation_id ?? matchedDraft?.id ?? null,
        sessionId: session.id,
        conversationId: session.conversation_id,
        spaceId: session.space_id ?? effectiveSpaceId,
        ensureBuildSession:
          !matchedDraft && !session.automation_id && !session.target_automation_id,
      })
    },
    [draftFlows, effectiveSpaceId, openFlowWorkspace],
  )

  const handleTemplateInstalled = useCallback(
    async (createdId: string) => {
      if (!effectiveSpaceId) {
        await loadFlows({ preserveFlowId: createdId })
        return
      }
      await openFlowWorkspace({
        flowId: createdId,
        spaceId: effectiveSpaceId,
        bypassOpenSuppress: true,
        ensureBuildSession: true,
        newLoopConversation: true,
      })
    },
    [effectiveSpaceId, loadFlows, openFlowWorkspace],
  )

  const handleCreateDraft = async () => {
    if (!effectiveSpaceId) return
    setBusy('create')
    try {
      const created = await createFlowDraft(effectiveSpaceId, {
        name: 'Untitled flow draft',
        description: null,
        trigger: DEFAULT_TRIGGER,
        actions: DEFAULT_ACTIONS,
      })
      await loadFlows()
      openBrowseSection('my-loops')
      await openFlowWorkspace({
        flowId: created.id,
        flowHint: created,
        spaceId: effectiveSpaceId,
        ensureBuildSession: true,
        newLoopConversation: true,
      })
      setValidation(null)
      setValidationFlowId(null)
      toast.success('Draft created')
    } finally {
      setBusy(null)
    }
  }

  const handleRenameFlow = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (editorSpaceId && selectedFlow) {
      if (trimmed === selectedFlow.name) return
      const updated = await updateFlowDraft(editorSpaceId, selectedFlow.id, { name: trimmed })
      setFlows((current) =>
        current.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
      )
      await loadFlows()
      return
    }

    if (effectiveSpaceId && buildPreviewFlow && trimmed !== buildPreviewFlow.name) {
      const updated = await updateFlowDraft(effectiveSpaceId, buildPreviewFlow.id, {
        name: trimmed,
      })
      setFlows((current) =>
        current.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
      )
      await loadFlows()
    }
  }

  const handleUpdateFlowDescription = async (description: string | null) => {
    if (!editorSpaceId || !selectedFlow) return
    const current = selectedFlow.description?.trim() || null
    if (description === current) return
    const updated = await updateFlowDraft(editorSpaceId, selectedFlow.id, { description })
    setFlows((currentFlows) =>
      currentFlows.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
    )
    await loadFlows()
  }

  const handleRenameCardFlow = useCallback(
    async (flow: FlowAutomationSummary, name: string) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const updated = flow.is_draft
          ? await updateFlowDraft(spaceId, flow.id, { name })
          : await updateFlow(spaceId, flow.id, { name })
        setFlows((current) =>
          current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
        )
        toast.success('Flow renamed')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not rename flow'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId],
  )

  const handleMakeAsTemplate = useCallback(
    async (flow: FlowAutomationSummary) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      if (isUserFlowTemplate(flow)) {
        openBrowseSection('my-templates')
        toast.info('This loop is already saved as a template')
        return
      }
      try {
        await createFlowDraft(spaceId, {
          name: `${FLOW_USER_TEMPLATE_NAME_PREFIX}${flow.name}`,
          description: flow.description ?? null,
          trigger: flow.trigger as FlowAutomation['trigger'],
          actions: [...flow.actions] as FlowAutomation['actions'],
        })
        await loadFlows()
        openBrowseSection('my-templates')
        toast.success('Saved as template')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save template'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId, loadFlows, openBrowseSection],
  )

  const handleUseUserTemplate = useCallback(
    async (template: FlowAutomationSummary) => {
      const spaceId = effectiveSpaceId ?? template.space_id
      if (!spaceId) return
      setUserTemplateInstallingId(template.id)
      try {
        const created = await createFlowDraft(spaceId, {
          name: userFlowTemplateDisplayName(template.name),
          description: template.description ?? null,
          trigger: template.trigger as FlowAutomation['trigger'],
          actions: [...template.actions] as FlowAutomation['actions'],
        })
        await loadFlows()
        setBrowseSection('my-loops')
        setPanelTab('browse')
        setSelectedFlowId(created.id)
        toast.success('Flow added from template')
      } finally {
        setUserTemplateInstallingId(null)
      }
    },
    [effectiveSpaceId, loadFlows],
  )

  const handleDuplicateCardFlow = useCallback(
    async (flow: FlowAutomationSummary, targetSpaceId?: string) => {
      const spaceId = targetSpaceId ?? flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const created = await createFlowDraft(spaceId, {
          name: `Copy of ${flow.name}`,
          description: flow.description ?? null,
          trigger: flow.trigger as FlowAutomation['trigger'],
          actions: [...flow.actions] as FlowAutomation['actions'],
        })
        await loadFlows()
        if (!targetSpaceId || targetSpaceId === effectiveSpaceId) setSelectedFlowId(created.id)
        toast.success(targetSpaceId ? 'Flow copied to space' : 'Flow duplicated')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not duplicate flow'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId, loadFlows],
  )

  const handleValidateCardFlow = useCallback(
    async (flow: FlowAutomationSummary) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const result = await validateFlowDraft(spaceId, flow as FlowAutomation)
        setValidation(result)
        setValidationFlowId(flow.id)
        if (result.valid) toast.success('Validation passed')
        else toast.error('Validation failed')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Validation failed'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId],
  )

  const handleToggleCardFlowEnabled = useCallback(
    async (flow: FlowAutomationSummary, enabled: boolean) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const updated = await updateFlow(spaceId, flow.id, { enabled })
        setFlows((current) =>
          current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
        )
        toast.success(enabled ? 'Flow enabled' : 'Flow paused')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not update flow'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId],
  )

  const handlePublishCardFlow = useCallback(
    async (flow: FlowAutomationSummary) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const result = await publishFlow(spaceId, flow.id)
        setFlows((current) =>
          current.map((row) => (row.id === result.flow.id ? { ...row, ...result.flow } : row)),
        )
        setValidation(result.validation)
        setValidationFlowId(result.flow.id)
        toast.success('Flow published')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not publish flow'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId],
  )

  const handleDeleteCardFlow = useCallback(
    async (flow: FlowAutomationSummary) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }

      suppressFlowCardOpen(flow.id)
      setSelectedFlowId((current) => (current === flow.id ? null : current))
      setValidationFlowId((current) => {
        if (current === flow.id) setValidation(null)
        return current === flow.id ? null : current
      })

      try {
        await deleteFlow(spaceId, flow.id)
        setFlows((current) => current.filter((row) => row.id !== flow.id))
        toast.success('Flow deleted')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not delete flow'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId],
  )

  const handleDiscardBuildSession = useCallback(
    async (session: { id: string; space_id?: string | null }) => {
      const spaceId = session.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this build')
        return
      }
      try {
        await deleteFlowBuildSession(spaceId, session.id)
        setFocusedBuildSessionId((current) => (current === session.id ? null : current))
        await refreshFlowBuildSessionLinks()
        await refreshFlowBuildSession()
        toast.success('Build discarded')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not discard build'
        toast.error(message)
        throw error
      }
    },
    [effectiveSpaceId, refreshFlowBuildSession, refreshFlowBuildSessionLinks],
  )

  const handleGoToFlowSpace = useCallback(
    (spaceId: string) => {
      const space = spaces.find((row) => row.id === spaceId)
      if (space && matchesFlowsConceptSpace(space)) {
        setCreateAnythingMode(true)
        persistFlowsCreateAnythingMode(true)
        setConceptSpaceId(spaceId)
        setSelectedSpaceId(null)
        setSelectedCampaignId(null)
      } else {
        setCreateAnythingMode(false)
        persistFlowsCreateAnythingMode(false)
        if (space?.campaign_id) setSelectedCampaignId(space.campaign_id)
        setSelectedSpaceId(spaceId)
      }
      setSelectedFlowId(null)
      openBrowseSection('my-loops')
    },
    [openBrowseSection, spaces],
  )

  const handleGoToFlowCampaign = useCallback(
    (campaignId: string) => {
      setSelectedCampaignId(campaignId)
      setSelectedSpaceId(null)
      setSelectedFlowId(null)
      openBrowseSection('my-loops')
    },
    [openBrowseSection],
  )

  const handleViewFlowRunHistory = useCallback(
    (flow: FlowAutomationSummary) => {
      const space = flow.space_id ? spaces.find((row) => row.id === flow.space_id) : null
      if (space && matchesFlowsConceptSpace(space)) {
        setCreateAnythingMode(true)
        persistFlowsCreateAnythingMode(true)
        if (flow.space_id) setConceptSpaceId(flow.space_id)
        setSelectedSpaceId(null)
        setSelectedCampaignId(null)
      } else {
        setCreateAnythingMode(false)
        persistFlowsCreateAnythingMode(false)
        if (flow.campaign_id) setSelectedCampaignId(flow.campaign_id)
        if (flow.space_id) setSelectedSpaceId(flow.space_id)
      }
      setSelectedFlowId(null)
      openBrowseSection('history')
    },
    [openBrowseSection, spaces],
  )

  const handleAskLoopToUpdateFlow = useCallback(
    async (flow: FlowLoopUpdateTarget) => {
      const spaceId = flow.space_id ?? effectiveSpaceId
      if (!spaceId) {
        toast.error('Could not find a space for this flow')
        return
      }
      try {
        const space = spaces.find((row) => row.id === spaceId)
        if (space && matchesFlowsConceptSpace(space)) {
          setCreateAnythingMode(true)
          persistFlowsCreateAnythingMode(true)
          setConceptSpaceId(spaceId)
          setSelectedSpaceId(null)
          setSelectedCampaignId(null)
        } else {
          setCreateAnythingMode(false)
          persistFlowsCreateAnythingMode(false)
          if (flow.campaign_id) setSelectedCampaignId(flow.campaign_id)
          else if (space?.campaign_id) setSelectedCampaignId(space.campaign_id)
          setSelectedSpaceId(spaceId)
        }
        const storedConversationId = readStoredLoopConversationId(spaceId)
        const conversationId =
          spaceId === effectiveSpaceId
            ? (loopConversationId ?? storedConversationId)
            : storedConversationId
        await createFlowBuildSession(spaceId, {
          intent: `Update flow: ${flow.name}`,
          name: `Update ${flow.name}`,
          mode: 'update',
          target_automation_id: flow.id,
          conversation_id: conversationId ?? undefined,
        })
        setLoopConversationId(conversationId)
        if (conversationId) setPendingLoopConversationSelection({ spaceId, conversationId })
        setLoopStartGateOpen(false)
        openBrowseSection('my-loops')
        if (spaceId === effectiveSpaceId) await refreshFlowBuildSession()
        await refreshFlowBuildSessionLinks()
        toast.success('Loop update started')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not start Loop update'
        toast.error(message)
        throw error
      }
    },
    [
      effectiveSpaceId,
      loopConversationId,
      refreshFlowBuildSession,
      refreshFlowBuildSessionLinks,
      spaces,
      openBrowseSection,
    ],
  )

  const handleDroppedFlowForLoop = useCallback(
    (payload: FlowChatDragPayload) => {
      const targetSpaceId = payload.spaceId ?? effectiveSpaceId
      setPendingLoopFlow(payload)
      setFocusedBuildSessionId(null)
      setLoopStartGateOpen(false)

      if (targetSpaceId && targetSpaceId !== effectiveSpaceId) {
        const space = spaces.find((row) => row.id === targetSpaceId)
        if (space && matchesFlowsConceptSpace(space)) {
          setCreateAnythingMode(true)
          persistFlowsCreateAnythingMode(true)
          setConceptSpaceId(targetSpaceId)
          setSelectedSpaceId(null)
          setSelectedCampaignId(null)
        } else {
          setCreateAnythingMode(false)
          persistFlowsCreateAnythingMode(false)
          if (space?.campaign_id) setSelectedCampaignId(space.campaign_id)
          setSkipStoredLoopConversationSpaceId(targetSpaceId)
          setSelectedSpaceId(targetSpaceId)
        }
      }
      toast.success('Flow added to Loop')
    },
    [effectiveSpaceId, spaces],
  )

  const handleLoopFlowDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!isLoopChatPanelDropTarget(event.target)) return
    if (!isFlowChatDrag([...event.dataTransfer.types])) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleLoopFlowDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isLoopChatPanelDropTarget(event.target)) return
      if (!isFlowChatDrag([...event.dataTransfer.types])) return
      const payload = readFlowChatDragPayload(event.dataTransfer)
      if (!payload) return
      event.preventDefault()
      event.stopPropagation()
      handleDroppedFlowForLoop(payload)
    },
    [handleDroppedFlowForLoop],
  )

  const handleEditorSave = async (data: FlowAutomationPayload) => {
    if (!editorSpaceId || !selectedFlow) return
    const updated = selectedFlow.is_draft
      ? await updateFlowDraft(editorSpaceId, selectedFlow.id, {
          name: data.name,
          trigger: data.trigger,
          actions: data.actions,
        })
      : await updateFlow(editorSpaceId, selectedFlow.id, {
          name: data.name,
          trigger: data.trigger,
          actions: data.actions,
        })
    setFlows((current) =>
      current.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
    )
    setSelectedFlowId(updated.id)
    await loadFlows({ preserveFlowId: updated.id, silent: true })
  }

  const handleEditorValidate = async (data: FlowAutomationPayload) => {
    if (!editorSpaceId || !selectedFlow) return
    setBusy('validate')
    try {
      const updated = selectedFlow.is_draft
        ? await updateFlowDraft(editorSpaceId, selectedFlow.id, {
            name: data.name,
            trigger: data.trigger,
            actions: data.actions,
          })
        : await updateFlow(editorSpaceId, selectedFlow.id, {
            name: data.name,
            trigger: data.trigger,
            actions: data.actions,
          })
      setFlows((current) =>
        current.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
      )
      setSelectedFlowId(updated.id)
      await loadFlows({ preserveFlowId: updated.id, silent: true })
      const result = await validateFlowDraft(editorSpaceId, updated)
      setValidation(result)
      setValidationFlowId(updated.id)
      if (result.valid) toast.success('Validation passed')
      else toast.error('Validation failed')
    } finally {
      setBusy(null)
    }
  }

  const handlePublish = async () => {
    if (!editorSpaceId || !selectedFlow || !canPublish) return
    setBusy('publish')
    try {
      if (selectedFlow.is_draft) {
        const result = await publishFlow(editorSpaceId, selectedFlow.id)
        setFlows((current) =>
          current.map((flow) => (flow.id === result.flow.id ? { ...flow, ...result.flow } : flow)),
        )
        setSelectedFlowId(result.flow.id)
        setValidation(result.validation)
        setValidationFlowId(result.flow.id)
        await loadFlows({ preserveFlowId: result.flow.id, silent: true })
        toast.success('Flow published')
        return
      }

      const updated = await updateFlow(editorSpaceId, selectedFlow.id, {
        name: selectedFlow.name,
        trigger: selectedFlow.trigger,
        actions: selectedFlow.actions,
      })
      const result = await validateFlowDraft(editorSpaceId, updated)
      setFlows((current) =>
        current.map((flow) => (flow.id === updated.id ? { ...flow, ...updated } : flow)),
      )
      setSelectedFlowId(updated.id)
      setValidation(result)
      setValidationFlowId(updated.id)
      await loadFlows({ preserveFlowId: updated.id, silent: true })
      if (!result.valid) {
        toast.error('Validation failed')
        return
      }
      toast.success(FLOWS_UI.flowUpdated)
    } finally {
      setBusy(null)
    }
  }

  const handleNavigateFlowsRoot = () => {
    setSelectedFlowId(null)
    setPendingLoopFlow(null)
    setLoopBuildPanelPinned(false)
    openBrowseSection('my-loops')
    if (!createAnythingMode) {
      setSelectedCampaignId(null)
      setSelectedSpaceId(null)
    }
  }

  const handleBackFromFlowEditor = useCallback(() => {
    setSelectedFlowId(null)
    setValidation(null)
    setValidationFlowId(null)
    setFocusedBuildSessionId(null)
  }, [])

  if (roleLoading || (role === 'admin' && spacesLoading)) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading Flows..." state="processing" size="lg" />
      </div>
    )
  }

  if (role !== 'admin') {
    return <FlowsForbiddenState />
  }

  return (
    <div
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3"
      onDragOver={handleLoopFlowDragOver}
      onDrop={handleLoopFlowDrop}
    >
      <div className="min-h-0 flex-1">
        <FlowsShell
          activeTab={panelTab}
          onSelectTab={handleSelectPanelTab}
          spaces={selectableSpaces}
          selectedCampaignId={createAnythingMode ? null : selectedCampaignId}
          onSelectCampaign={handleSelectCampaign}
          selectedSpaceId={createAnythingMode ? null : selectedSpaceId}
          onSelectSpace={handleSelectSpace}
          flowName={shellFlowName}
          onRenameFlow={shellFlowName ? handleRenameFlow : undefined}
          renameFlowDisabled={!!busy}
          flowDescription={isFlowEditorOpen ? selectedFlow?.description : undefined}
          onUpdateDescription={isFlowEditorOpen ? handleUpdateFlowDescription : undefined}
          descriptionDisabled={!!busy}
          onNavigateFlowsRoot={handleNavigateFlowsRoot}
          showClarificationsTab={showClarificationsTab}
          hideSectionTabs={isFlowEditorOpen || !showClarificationsTab}
          flowScopeLocations={editorFlowScopeLocations}
          onNavigateToFlowLocation={handleNavigateToFlowLocation}
        >
          {panelTab === 'browse' &&
          selectedFlowId &&
          editorFlow &&
          editorSpaceId &&
          browseSection === 'my-loops' ? (
            <FlowsEditorPanel
              spaceId={editorSpaceId}
              flow={editorFlow}
              campaignId={scopeSpace?.campaign_id ?? editorFlow.campaign_id ?? null}
              fields={fieldsForAutomations}
              triggerContextSpaces={triggerContextSpaces}
              flowSpaceIsConceptSandbox={editorFlowSpaceIsConceptSandbox}
              roster={roster}
              contactsTriggerPickers={contactsTriggerPickers}
              validation={validation}
              canPublish={canPublish}
              busy={busy}
              onBack={handleBackFromFlowEditor}
              onSave={handleEditorSave}
              onValidate={handleEditorValidate}
              onPublish={() => void handlePublish()}
              onToggleEnabled={handleToggleCardFlowEnabled}
              onAskLoopToFix={handleAskLoopToFix}
            />
          ) : panelTab === 'browse' ? (
            <FlowsBrowseHub
              section={browseSection}
              onSectionChange={handleBrowseSectionChange}
              spaceId={effectiveSpaceId}
              onInstalled={(flowId) => void handleTemplateInstalled(flowId)}
              onCreateBlank={() => void handleCreateDraft()}
              webhooksPanel={<FlowsWebhooksView spaceId={effectiveSpaceId} />}
              myTemplatesPanel={
                <FlowsMyTemplatesPanel
                  templates={userTemplateFlows}
                  spaceId={effectiveSpaceId}
                  installingId={userTemplateInstallingId}
                  onUseTemplate={handleUseUserTemplate}
                />
              }
              historyPanel={
                <FlowsHistoryView
                  campaignId={createAnythingMode ? null : selectedCampaignId}
                  spaceId={createAnythingMode ? conceptSpaceId : selectedSpaceId}
                  open
                  automationNames={automationNames}
                  automationMeta={runAutomationMeta}
                  spaceMeta={runSpaceMeta}
                />
              }
              myLoopsPanel={
                <FlowsManagePanel
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  search={search}
                  onSearchChange={setSearch}
                  searchOpen={searchOpen}
                  onSearchOpenChange={setSearchOpen}
                  draftFilter={draftFilter}
                  onDraftFilterChange={setDraftFilter}
                  enabledFilter={enabledFilter}
                  onEnabledFilterChange={setEnabledFilter}
                  triggerFilter={triggerFilter}
                  onTriggerFilterChange={setTriggerFilter}
                  triggerFilterOptions={triggerFilterOptions}
                  incompleteOnly={incompleteOnly}
                  onIncompleteOnlyChange={setIncompleteOnly}
                  sort={sort}
                  onSortChange={setSort}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  groupSort={groupSort}
                  onGroupSortChange={setGroupSort}
                  flowsLoading={flowsLoading}
                  flows={manageFlows}
                  spaces={spaces}
                  filteredFlows={manageFilteredFlows}
                  draftFlows={draftFlows}
                  orphanBuildSessions={orphanBuildSessions}
                  draftBuildLinks={draftBuildLinks}
                  flowGroups={flowGroups}
                  collapsedGroupKeys={collapsedGroupKeys}
                  onToggleGroup={toggleGroup}
                  onSelectFlow={handleSelectFlow}
                  onOpenDraftPlan={handleOpenDraftPlan}
                  onOpenDraftFlow={handleOpenDraftFlow}
                  onOpenDraftSession={handleOpenDraftSession}
                  onOpenBuildSession={handleOpenBuildSession}
                  menuHandlers={{
                    onRenameFlow: handleRenameCardFlow,
                    onDuplicateFlow: handleDuplicateCardFlow,
                    onMakeAsTemplate: handleMakeAsTemplate,
                    onValidateFlow: handleValidateCardFlow,
                    onToggleEnabled: handleToggleCardFlowEnabled,
                    onPublishFlow: handlePublishCardFlow,
                    onDeleteFlow: handleDeleteCardFlow,
                    onDiscardBuild: handleDiscardBuildSession,
                    onGoToSpace: handleGoToFlowSpace,
                    onGoToCampaign: handleGoToFlowCampaign,
                    onViewRunHistory: handleViewFlowRunHistory,
                    onAskLoopToUpdate: handleAskLoopToUpdateFlow,
                    onAskLoopToFix: handleAskLoopToFix,
                    onFlowValidated: (flowId, result) => {
                      setValidation(result)
                      setValidationFlowId(flowId)
                    },
                    selectedSpaceId: effectiveSpaceId,
                  }}
                  showScopeMeta={showFlowScopeMeta}
                />
              }
            />
          ) : panelTab === 'clarifications' &&
            effectiveSpaceId &&
            flowBuildSummary &&
            activeBuildSessionId &&
            showClarificationsTab ? (
            <FlowClarificationsView
              spaceId={effectiveSpaceId}
              sessionId={activeBuildSessionId}
              clarifications={openBuildClarifications}
              onAnswered={refreshFlowBuildSession}
            />
          ) : null}
        </FlowsShell>
      </div>
    </div>
  )
}
