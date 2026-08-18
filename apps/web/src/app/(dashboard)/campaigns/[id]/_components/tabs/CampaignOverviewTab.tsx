'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Brain,
  LayoutGrid,
  Plus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { LucideIcon } from '@/components/ui/IconPicker'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { brainScopeHref } from '@/features/brain/lib/brain-scope-nav'
import type { Mission, MissionAgent } from '@/features/mission-control/types'
import type { CampaignTeamAgent } from '@/features/studio/services/campaign.service'
import { createSpace, fetchSpaces } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { matchesFlowsConceptSpace } from '@/lib/flows/flows-scope-storage'
import { isHiddenClientGeneralSpace } from '@/lib/spaces/page-grader-client-general-space'
import { CAMPAIGN_VIEW_MESSAGES } from '../../_config/campaign-view-messages.config'
import { CampaignOverviewDocsSection } from './CampaignOverviewDocsSection'

interface CampaignOverviewTabProps {
  campaignId: string
  campaignName: string
  dashboardMissions: Mission[]
  dashboardAgents: MissionAgent[]
  campaignTeam: CampaignTeamAgent[]
  isSystemGeneral?: boolean
  onOpenTab: (tab: 'dashboard' | 'knowledge' | 'reporting') => void
  onManageTeam: () => void
}

export function CampaignOverviewTab({
  campaignId,
  campaignName,
  dashboardMissions,
  dashboardAgents,
  campaignTeam,
  isSystemGeneral = false,
  onOpenTab,
  onManageTeam,
}: CampaignOverviewTabProps) {
  const router = useRouter()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [creatingSpace, setCreatingSpace] = useState(false)

  const loadSpaces = useCallback(async () => {
    setLoadingSpaces(true)
    try {
      const rows = await fetchSpaces({ campaign_id: campaignId, limit: 100 })
      setSpaces(rows)
    } catch {
      setSpaces([])
    } finally {
      setLoadingSpaces(false)
    }
  }, [campaignId])

  useEffect(() => {
    void loadSpaces()
  }, [loadSpaces])

  const missionStats = useMemo(() => {
    const scoped = dashboardMissions.filter((m) => m.campaign_id === campaignId)
    return {
      open: scoped.filter(
        (m) =>
          m.status !== 'done' &&
          m.status !== 'failed' &&
          m.status !== 'dead_letter' &&
          m.status !== 'archived',
      ).length,
      blocked: scoped.filter((m) => m.status === 'blocked').length,
      done: scoped.filter((m) => m.status === 'done').length,
    }
  }, [campaignId, dashboardMissions])

  const openSpace = (spaceId: string, opts?: { docs?: boolean }) => {
    const store = useSpacesStore.getState()
    store.setActiveSpace(spaceId)
    if (opts?.docs) {
      const space = store.spaces.find((row) => row.id === spaceId) ?? spaces.find((row) => row.id === spaceId)
      const docsView = space?.schema?.views?.find(
        (view) => view && typeof view === 'object' && (view as { type?: string }).type === 'docs',
      ) as { id?: string } | undefined
      if (docsView?.id) store.setActiveView(docsView.id)
    }
    router.push(`/spaces?space=${encodeURIComponent(spaceId)}`)
  }

  const handleCreateSpace = async () => {
    if (creatingSpace) return
    setCreatingSpace(true)
    try {
      const space = await createSpace({
        title: 'Untitled space',
        campaign_id: campaignId,
      })
      toast.success(`Created space in "${campaignName}"`)
      await loadSpaces()
      openSpace(space.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create space')
    } finally {
      setCreatingSpace(false)
    }
  }

  const trainKnowledgeHref = brainScopeHref(`campaign:${campaignId}`, 'add-info')
  const visibleSpaces = spaces.filter((space) => !isHiddenClientGeneralSpace(space))
  const primarySpaceId =
    visibleSpaces.find((space) => !matchesFlowsConceptSpace(space))?.id ??
    visibleSpaces[0]?.id ??
    null

  return (
    <div className="gap-spacing-6 flex flex-col pb-8">
      {isSystemGeneral ? (
        <p className="surface-card border-border rounded-spacing-3 body-3 text-muted-foreground border p-4">
          {CAMPAIGN_VIEW_MESSAGES.generalWorkspaceIntro}
        </p>
      ) : null}
      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onOpenTab('knowledge')}
          className="surface-card border-border rounded-spacing-3 hover:bg-hover-subtle gap-spacing-3 flex flex-col border p-4 text-left transition-colors"
        >
          <Brain className="text-primary h-5 w-5" />
          <span className="body-2 text-foreground font-semibold">
            {isSystemGeneral
              ? CAMPAIGN_VIEW_MESSAGES.trainKnowledgeTitleGeneral
              : CAMPAIGN_VIEW_MESSAGES.trainKnowledgeTitle}
          </span>
          <span className="body-4 text-muted-foreground">
            {CAMPAIGN_VIEW_MESSAGES.trainKnowledgeBody}
          </span>
        </button>
        <Link
          href={trainKnowledgeHref}
          className="surface-card border-border rounded-spacing-3 hover:bg-hover-subtle gap-spacing-3 flex flex-col border p-4 transition-colors"
        >
          <Brain className="text-primary h-5 w-5" />
          <span className="body-2 text-foreground font-semibold">
            {CAMPAIGN_VIEW_MESSAGES.addKnowledgeTitle}
          </span>
          <span className="body-4 text-muted-foreground">
            {isSystemGeneral
              ? CAMPAIGN_VIEW_MESSAGES.addKnowledgeBodyGeneral
              : CAMPAIGN_VIEW_MESSAGES.addKnowledgeBody}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => onOpenTab('reporting')}
          className="surface-card border-border rounded-spacing-3 hover:bg-hover-subtle gap-spacing-3 flex flex-col border p-4 text-left transition-colors"
        >
          <LayoutGrid className="text-primary h-5 w-5" />
          <span className="body-2 text-foreground font-semibold">View reporting</span>
          <span className="body-4 text-muted-foreground">
            Funnels, email, social, revenue, and mission outcomes.
          </span>
        </button>
      </div>

      <div className="gap-spacing-4 grid grid-cols-1 lg:grid-cols-2">
        <section className="surface-card border-border rounded-spacing-3 border p-4">
          <div className="mb-spacing-3 flex items-center justify-between gap-2">
            <h2 className="body-2 text-foreground font-semibold uppercase tracking-wide">
              Workspaces
            </h2>
            <button
              type="button"
              onClick={() => void handleCreateSpace()}
              disabled={creatingSpace}
              className="chip-glass-neutral body-4 inline-flex items-center gap-1 rounded-lg px-2 py-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {creatingSpace ? 'Creating…' : 'New space'}
            </button>
          </div>
          {loadingSpaces ? (
            <VibeyLoadingOrb size="sm" text="Loading spaces…" state="processing" />
          ) : visibleSpaces.length === 0 ? (
            <p className="body-3 text-muted-foreground">
              {isSystemGeneral
                ? CAMPAIGN_VIEW_MESSAGES.emptySpacesGeneral
                : CAMPAIGN_VIEW_MESSAGES.emptySpaces}
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleSpaces.map((space) => {
                const icon =
                  typeof space.schema?.icon === 'string' && space.schema.icon.length > 0
                    ? space.schema.icon
                    : 'layout-grid'
                return (
                  <li key={space.id}>
                    <button
                      type="button"
                      onClick={() => openSpace(space.id)}
                      className="hover:bg-hover-subtle rounded-spacing-2 body-3 text-foreground flex w-full items-center gap-2 px-2 py-2 text-left"
                    >
                      <LucideIcon name={icon} className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{space.title}</span>
                      <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="surface-card border-border rounded-spacing-3 border p-4">
          <div className="mb-spacing-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <h2 className="body-2 text-foreground font-semibold uppercase tracking-wide">Team</h2>
            </div>
            <button
              type="button"
              onClick={onManageTeam}
              className="chip-glass-neutral body-4 inline-flex items-center gap-1 rounded-lg px-2 py-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage team
            </button>
          </div>
          {dashboardAgents.length === 0 ? (
            <div className="gap-spacing-3 flex flex-col items-start">
              <p className="body-3 text-muted-foreground">
                {isSystemGeneral
                  ? CAMPAIGN_VIEW_MESSAGES.emptyTeamGeneral
                  : CAMPAIGN_VIEW_MESSAGES.emptyTeam}
              </p>
              <button
                type="button"
                onClick={onManageTeam}
                className="button-glass-primary body-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add agents
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {dashboardAgents.map((agent) => (
                <li key={agent.id} className="body-3 text-foreground flex items-center gap-2">
                  {agent.image_url ? (
                    <img
                      src={agent.image_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="bg-secondary body-4 flex h-7 w-7 items-center justify-center rounded-full">
                      {agent.name.charAt(0)}
                    </span>
                  )}
                  <span>{agent.name}</span>
                </li>
              ))}
            </ul>
          )}
          {campaignTeam.length > 0 && (
            <p className="body-4 text-muted-foreground mt-3">
              {campaignTeam.length} agent slot{campaignTeam.length === 1 ? '' : 's'} on this
              campaign.
            </p>
          )}
        </section>
      </div>

      <CampaignOverviewDocsSection
        campaignId={campaignId}
        primarySpaceId={primarySpaceId}
        onOpenSpace={(spaceId) => openSpace(spaceId, { docs: true })}
      />

      <section className="surface-card border-border rounded-spacing-3 border p-4">
        <div className="mb-spacing-3 flex items-center justify-between gap-2">
          <h2 className="body-2 text-foreground font-semibold uppercase tracking-wide">
            Active work
          </h2>
          <button
            type="button"
            onClick={() => onOpenTab('dashboard')}
            className="body-4 text-primary hover:underline"
          >
            Open Work tab
          </button>
        </div>
        <div className="gap-spacing-3 grid grid-cols-3">
          <div className="chip-glass-neutral rounded-spacing-2 p-3 text-center">
            <p className="title-h5 text-foreground tabular-nums">{missionStats.open}</p>
            <p className="body-4 text-muted-foreground">Open missions</p>
          </div>
          <div className="chip-glass-neutral rounded-spacing-2 p-3 text-center">
            <p className="title-h5 text-foreground tabular-nums">{missionStats.blocked}</p>
            <p className="body-4 text-muted-foreground">Blocked</p>
          </div>
          <div className="chip-glass-neutral rounded-spacing-2 p-3 text-center">
            <p className="title-h5 text-foreground tabular-nums">{missionStats.done}</p>
            <p className="body-4 text-muted-foreground">Done</p>
          </div>
        </div>
      </section>

      <p className="body-4 text-muted-foreground">
        Market-wide buyer insights (ICP, objections across clients) live in{' '}
        <Link href="/brain?scope=customer" className="text-primary font-medium hover:underline">
          Customer Brain
        </Link>{' '}
        — org-level, not per client.
      </p>
    </div>
  )
}
