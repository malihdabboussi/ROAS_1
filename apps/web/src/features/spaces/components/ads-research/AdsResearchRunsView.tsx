'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { useShellStore } from '@/components/shell/use-shell-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchDeliverablesForMissions,
  fetchMissions,
  type Mission,
  type MissionDeliverable,
} from '@/lib/missions'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import {
  ensureAdsResearchAgencyTeam,
  listSavedAdSearches,
  type SavedAdSearchSummary,
} from '../../services/ads-research.service'
import { AdsResearchRunCard } from './AdsResearchRunCard'
import { AdsResearchRunDetailView } from './AdsResearchRunDetailView'

const RESEARCH_INTAKE_PROMPT = `Start an Ads Research intake for this Space with Blaze.

Ask me these three questions together before creating anything:
1. What is this research for?
2. Standard or deep?
3. Anything in particular you're looking for?

After I answer, stay as Blaze and use \`delegate_to_agent\` with target_agent_key: \`vibey\`. In the task_description, tell Vibey to call \`create_mission\` with the exact current space_id and campaign_id, title \`Ads Research\`, assigned_agent_key \`ads_manager\`, and input.playbook_id: \`ads-research\`. Put my answers into input.playbook_kickoff using prompt, depth, reporting_period, selected_campaigns, competitors, and links. Do not call \`create_mission\` yourself because mission creation is owned by Vibey.

Only after the delegated action succeeds, confirm "New mission created" in chat and show or link the mission. Do not send me to Mission Control or ask me to create the mission manually. Use the mounted Meta connection as the source of truth for current performance. Do not infer that Meta is disconnected from missing documents or prior research.`

export function AdsResearchRunsView({
  spaceId,
  campaignId,
}: {
  spaceId: string
  campaignId: string | null
}) {
  const [runs, setRuns] = useState<Mission[]>([])
  const [deliverables, setDeliverables] = useState<Record<string, MissionDeliverable[]>>({})
  const [searches, setSearches] = useState<SavedAdSearchSummary[]>([])
  const [selectedRun, setSelectedRun] = useState<Mission | null>(null)
  const [missionModalOpen, setMissionModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preparingTeam, setPreparingTeam] = useState(false)
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const openFreshChatDrawer = useShellStore((state) => state.openFreshChatDrawer)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const [missions, savedSearches] = await Promise.all([
        fetchMissions({
          space_id: spaceId,
          campaign_id: campaignId ?? undefined,
        }),
        listSavedAdSearches(spaceId),
      ])
      const researchRuns = missions.filter(
        (mission) => mission.input?.playbook_id === 'ads-research',
      )
      setRuns(researchRuns)
      setSearches(savedSearches)
      setDeliverables(await fetchDeliverablesForMissions(researchRuns.map((mission) => mission.id)))
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }, [campaignId, spaceId])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  const openBlazeChat = async (content: string) => {
    if (!campaignId) {
      toast.error(ADS_RESEARCH_MESSAGES.NO_CAMPAIGN)
      return
    }
    setPreparingTeam(true)
    try {
      const team = await ensureAdsResearchAgencyTeam(campaignId)
      const blazeAgentKey = team.agents.find((agent) => agent.role_key === 'ads_manager')?.agent_key
      if (!blazeAgentKey) throw new Error('Ads manager agent was not provisioned')
      openFreshChatDrawer()
      seedComposer({
        content,
        agentKey: blazeAgentKey,
        railIntent: 'new',
        workContext: { surface: 'spaces', spaceId, campaignId },
      })
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.TEAM_SETUP_FAILED)
    } finally {
      setPreparingTeam(false)
    }
  }

  const startResearch = () => void openBlazeChat(RESEARCH_INTAKE_PROMPT)

  const runCountLabel = useMemo(
    () => `${runs.length} research ${runs.length === 1 ? 'run' : 'runs'}`,
    [runs.length],
  )

  if (selectedRun) {
    return (
      <>
        <AdsResearchRunDetailView
          run={selectedRun}
          deliverables={deliverables[selectedRun.id] ?? []}
          spaceId={spaceId}
          onBack={() => setSelectedRun(null)}
          onOpenMission={() => setMissionModalOpen(true)}
        />
        {missionModalOpen ? (
          <MissionDetailModal
            mission={selectedRun}
            onClose={() => setMissionModalOpen(false)}
            onUpdated={() => void loadRuns()}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section className="gap-spacing-3 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="body-2 text-foreground font-semibold">Research runs</h2>
            <p className="body-4 text-muted-foreground">{runCountLabel}</p>
          </div>
          <button
            type="button"
            className="button-glass-primary button-compact gap-spacing-2 inline-flex items-center"
            disabled={!campaignId || preparingTeam}
            onClick={startResearch}
          >
            <Sparkles className="icon-sm" />
            {preparingTeam
              ? ADS_RESEARCH_MESSAGES.PREPARING_TEAM
              : ADS_RESEARCH_MESSAGES.RUN_BUTTON}
          </button>
        </div>
        {loading ? (
          <div className="py-spacing-8 flex justify-center">
            <VibeyLoadingOrb text="Loading research runs…" state="processing" size="md" />
          </div>
        ) : runs.length === 0 ? (
          <div className="surface-card border-border p-spacing-6 rounded-spacing-3 flex flex-col items-center border text-center">
            <Search className="icon-lg text-muted-foreground" />
            <p className="body-2 text-foreground mt-spacing-3 font-semibold">
              {ADS_RESEARCH_MESSAGES.EMPTY_TITLE}
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-xl">
              {ADS_RESEARCH_MESSAGES.EMPTY_DESCRIPTION}
            </p>
          </div>
        ) : (
          <div className="gap-spacing-3 grid lg:grid-cols-2">
            {runs.map((run) => (
              <AdsResearchRunCard
                key={run.id}
                run={run}
                deliverables={deliverables[run.id] ?? []}
                searches={searches.filter((search) => search.mission_ids?.includes(run.id))}
                onOpen={() => setSelectedRun(run)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
