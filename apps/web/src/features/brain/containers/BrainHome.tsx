'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { ShareModal } from '@/components/org'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { BRAIN_TOAST_ERRORS } from '@/features/brain/config/brain-toast-errors.config'
import { useBrainScopeMenuActions } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import {
  useBrainScopeNavOptions,
  type BrainScopeNavOption,
} from '@/features/brain/hooks/use-brain-scope-nav-options'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import {
  isKnowledgeScopeType,
  knowledgeStatsToHealth,
  matchesSearch,
  SCOPE_SECTIONS,
  sectionIncludesScope,
  sortBrains,
  type BrainSort,
  type BrainStatusFilter,
  type BrainViewMode,
} from '@/features/brain/lib/brain-home-state'
import type { BrainScopeToolbarAction } from '@/features/brain/lib/brain-scope-nav'
import { dispatchBrainTrainModal } from '@/features/brain/lib/brain-training-modal.events'
import { fetchBrainHealthBatch } from '@/features/brain/services/brain.service'
import {
  fetchKnowledgeGraphStatsBatch,
  type KnowledgeGraphStats,
} from '@/features/brain/services/knowledge-graph.service'
import type { BrainHealthData } from '@/features/brain/types'
import { useOrgStore } from '@/lib/org'
import { brainCardStatus, BrainHomeGridCard } from '../components/BrainHomeGridCard'
import { BrainHomeGridSections } from '../components/BrainHomeGridSections'
import { BrainHomeListView, type BrainListSection } from '../components/BrainHomeListView'
import { BrainHomeToolbar } from '../components/BrainHomeToolbar'
import CortexMaxModal from '../components/CortexMaxModal'

export default function BrainHome() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const { scopeOptions, agentsWithoutBrain, loading: scopeLoading } = useBrainScopeNavOptions()
  const { getMenuContext, shareModalProps } = useBrainScopeMenuActions()

  const [healthByBrainId, setHealthByBrainId] = useState<Map<string, BrainHealthData>>(new Map())
  const [knowledgeStatsByScopeId, setKnowledgeStatsByScopeId] = useState<
    Map<string, KnowledgeGraphStats>
  >(new Map())
  const [healthLoading, setHealthLoading] = useState(true)

  const [view, setView] = useState<BrainViewMode>('list')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sort, setSort] = useState<BrainSort | null>(null)
  const [statusFilters, setStatusFilters] = useState<BrainStatusFilter[]>([])
  const [modalOption, setModalOption] = useState<BrainScopeNavOption | null>(null)
  const [cortexMaxOpen, setCortexMaxOpen] = useState(false)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)

  useEffect(() => {
    setWorkContext({ surface: 'brain' })
  }, [setWorkContext])

  const openTrainForOption = useCallback((option: BrainScopeNavOption) => {
    if (!option.brainId) return
    dispatchBrainTrainModal({ scopeId: option.id })
  }, [])

  const openCortexMaxForOption = useCallback((option: BrainScopeNavOption) => {
    if (!option.brainId) return
    setModalOption(option)
    setCortexMaxOpen(true)
  }, [])

  const buildMenuContext = useCallback(
    (option: BrainScopeNavOption) => {
      const base = getMenuContext(option)
      return {
        ...base,
        onOpenWithAction: (action: BrainScopeToolbarAction) => {
          if (action === 'train' && base.canTrain && option.brainId) {
            openTrainForOption(option)
            return
          }
          if (action === 'cortex-max' && base.canTrain && option.brainId) {
            openCortexMaxForOption(option)
            return
          }
          base.onOpenWithAction(action)
        },
      }
    },
    [getMenuContext, openTrainForOption, openCortexMaxForOption],
  )

  const defaultTrainOption = useMemo(() => {
    const user = scopeOptions.find((o) => o.scopeType === 'user')
    if (user?.brainId) return user
    return scopeOptions.find((o) => o.brainId) ?? null
  }, [scopeOptions])

  const effectiveSort: BrainSort = sort ?? 'name_asc'
  const toggleStatusFilter = useCallback((id: BrainStatusFilter) => {
    setStatusFilters((prev) =>
      prev.includes(id) ? prev.filter((status) => status !== id) : [...prev, id],
    )
  }, [])
  const openDefaultTrainOption = useCallback(() => {
    if (defaultTrainOption) openTrainForOption(defaultTrainOption)
  }, [defaultTrainOption, openTrainForOption])

  useEffect(() => {
    if (scopeLoading || searchParams.has('scope')) return
    const action = searchParams.get('action')
    if (action !== 'train' && action !== 'cortex-max') return
    const target = defaultTrainOption
    if (!target?.brainId) return
    if (action === 'train') openTrainForOption(target)
    else openCortexMaxForOption(target)
    router.replace('/brain', { scroll: false })
  }, [
    defaultTrainOption,
    openCortexMaxForOption,
    openTrainForOption,
    router,
    scopeLoading,
    searchParams,
  ])

  useEffect(() => {
    if (scopeLoading) return
    const brainIds = scopeOptions.flatMap((option) => (option.brainId ? [option.brainId] : []))
    const campaignIds = scopeOptions.flatMap((option) =>
      option.scopeType === 'campaign_knowledge' && option.campaignId ? [option.campaignId] : [],
    )
    if (brainIds.length === 0 && campaignIds.length === 0) {
      setHealthByBrainId(new Map())
      setKnowledgeStatsByScopeId(new Map())
      setHealthLoading(false)
      return
    }
    let cancelled = false
    setHealthLoading(true)
    void (async () => {
      try {
        const [healthMap, knowledgeStats] = await Promise.all([
          fetchBrainHealthBatch(brainIds),
          fetchKnowledgeGraphStatsBatch({ campaignIds }).catch(
            () =>
              ({ spaces: {}, campaigns: {} }) as {
                spaces: Record<string, KnowledgeGraphStats>
                campaigns: Record<string, KnowledgeGraphStats>
              },
          ),
        ])
        if (cancelled) return
        const knowledgeMap = new Map<string, KnowledgeGraphStats>()
        for (const option of scopeOptions) {
          if (option.scopeType === 'campaign_knowledge' && option.campaignId) {
            const stats = knowledgeStats.campaigns[option.campaignId]
            if (stats) knowledgeMap.set(option.id, stats)
          }
        }
        setHealthByBrainId(healthMap)
        setKnowledgeStatsByScopeId(knowledgeMap)
      } catch {
        if (cancelled) return
        setHealthByBrainId(new Map())
        setKnowledgeStatsByScopeId(new Map())
        toast.error(BRAIN_TOAST_ERRORS.HEALTH_BATCH_FAILED.userMessage)
      } finally {
        if (!cancelled) setHealthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [scopeOptions, scopeLoading])

  const filteredByToolbar = useMemo(() => {
    return scopeOptions.filter((option) => {
      if (!matchesSearch(option, search)) return false
      if (statusFilters.length === 0) return true
      const health = option.brainId ? healthByBrainId.get(option.brainId) : undefined
      const status = brainCardStatus(health, healthLoading)
      return statusFilters.includes(status)
    })
  }, [scopeOptions, search, statusFilters, healthByBrainId, healthLoading])

  const sortedFiltered = useMemo(
    () => sortBrains(filteredByToolbar, effectiveSort, healthByBrainId),
    [filteredByToolbar, effectiveSort, healthByBrainId],
  )

  const resolveCardHealth = useCallback(
    (option: BrainScopeNavOption): BrainHealthData | undefined => {
      const knowledgeStats = knowledgeStatsByScopeId.get(option.id)
      if (isKnowledgeScopeType(option.scopeType)) {
        return knowledgeStats ? knowledgeStatsToHealth(knowledgeStats) : undefined
      }
      return option.brainId ? healthByBrainId.get(option.brainId) : undefined
    },
    [healthByBrainId, knowledgeStatsByScopeId],
  )

  const visibleSections = useMemo((): BrainListSection[] => {
    return SCOPE_SECTIONS.flatMap((section) => {
      const inScope = scopeOptions.filter((o) => sectionIncludesScope(section, o.scopeType))
      const items = sortedFiltered.filter((o) => sectionIncludesScope(section, o.scopeType))
      const isAgentSection = section.id === 'agent'
      const readyAgentCount = agentsWithoutBrain.length
      const showAgentAddRow = isAgentSection && readyAgentCount > 0
      const showSection =
        section.id === 'company'
          ? isOrg
          : isAgentSection
            ? inScope.length > 0 || readyAgentCount > 0 || Boolean(section.emptyText)
            : inScope.length > 0 || Boolean(section.emptyText)
      if (!showSection || (items.length === 0 && !showAgentAddRow)) return []
      return [
        {
          id: section.id,
          title: section.title,
          color: section.color,
          items,
          addAgentBrain: showAgentAddRow
            ? { agents: agentsWithoutBrain, count: readyAgentCount }
            : undefined,
        },
      ]
    })
  }, [agentsWithoutBrain, isOrg, scopeOptions, sortedFiltered])

  const renderBrainCard = useCallback(
    (option: BrainScopeNavOption) => {
      const menuContext = buildMenuContext(option)
      const cardHealth = resolveCardHealth(option)
      return (
        <BrainHomeGridCard
          key={option.id}
          option={option}
          health={cardHealth}
          loading={healthLoading}
          imageUrl={option.imageUrl ?? null}
          menuContext={menuContext}
          canTrain={menuContext.canTrain}
          onTrain={
            menuContext.canTrain && option.brainId ? () => openTrainForOption(option) : undefined
          }
          onCortexMax={
            menuContext.canTrain && option.brainId
              ? () => openCortexMaxForOption(option)
              : undefined
          }
        />
      )
    },
    [
      buildMenuContext,
      healthLoading,
      openCortexMaxForOption,
      openTrainForOption,
      resolveCardHealth,
    ],
  )

  if (scopeLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading brains..." state="processing" size="lg" />
      </div>
    )
  }

  return (
    <div className="p-spacing-3 relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div className="rounded-spacing-3 border-border flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border">
        <div className="gap-spacing-3 p-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <BrainHomeToolbar
            search={search}
            searchOpen={searchOpen}
            sort={sort}
            statusFilters={statusFilters}
            view={view}
            trainDisabled={!defaultTrainOption?.brainId}
            onSearchChange={setSearch}
            onSearchOpenChange={setSearchOpen}
            onStatusToggle={toggleStatusFilter}
            onSortChange={setSort}
            onViewChange={setView}
            onTrain={openDefaultTrainOption}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {sortedFiltered.length === 0 && scopeOptions.some((o) => matchesSearch(o, search)) ? (
              <div className="body-3 text-muted-foreground p-spacing-6 text-center">
                No brains match the current filters.
              </div>
            ) : view === 'list' ? (
              <BrainHomeListView
                sections={visibleSections}
                healthLoading={healthLoading}
                resolveHealth={resolveCardHealth}
                getMenuContext={buildMenuContext}
                onAddAgentBrain={() => dispatchBrainAddAgentModal()}
              />
            ) : (
              <BrainHomeGridSections
                scopeOptions={scopeOptions}
                sortedFiltered={sortedFiltered}
                agentsWithoutBrain={agentsWithoutBrain}
                isOrg={isOrg}
                renderBrainCard={renderBrainCard}
                onAddAgentBrain={() => dispatchBrainAddAgentModal()}
              />
            )}
          </div>
        </div>
      </div>

      {shareModalProps ? (
        <ShareModal
          open={shareModalProps.open}
          onClose={shareModalProps.onClose}
          resourceType="brain"
          resourceId={shareModalProps.resourceId}
          resourceName={shareModalProps.resourceName}
        />
      ) : null}

      {cortexMaxOpen && modalOption?.brainId ? (
        <CortexMaxModal
          open={cortexMaxOpen}
          onOpenChange={setCortexMaxOpen}
          brainId={modalOption.brainId}
          memoryCount={healthByBrainId.get(modalOption.brainId)?.total_memories ?? 0}
          scopeType={
            modalOption.scopeType === 'campaign_knowledge' || modalOption.scopeType === 'person'
              ? 'user'
              : modalOption.scopeType
          }
        />
      ) : null}
    </div>
  )
}
