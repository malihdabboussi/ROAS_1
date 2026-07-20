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
import { AdsResearchRunCard } from './AdsResearchRunCard'
import { AdsResearchRunDetailView } from './AdsResearchRunDetailView'

const RESEARCH_INTAKE_PROMPT = `Start an Ads Research intake for this Space with Blaze.

Ask me these three questions together before creating anything:
1. What is this research for?
2. Standard or deep?
3. Anything in particular you're looking for?

After I answer, create a mission with playbook_id \`ads-research\` using the current Space and campaign context. Confirm "New mission created" in chat and show or link the mission. Use the mounted Meta connection as the source of truth for current performance. Do not infer that Meta is disconnected from missing documents or prior research.`

function buildResearchRerunPrompt(run: Mission): string {
  return `Rerun Ads Research mission ${run.id} as a fresh replacement mission with Blaze.

Before creating the replacement, verify the client identity in the current Space and campaign context:
1. Resolve the exact campaign and Space from the current work context.
2. Read the campaign, Space, linked files, active Theme, and relevant Customer Brain evidence. Use Company Brain only for agency standards, not as proof of the client's identity.
3. Verify the mounted Meta ad account, Facebook Page, and available campaigns. Treat account and advertiser names as routing evidence, not proof of the business model.
4. Show me a concise identity summary with the client or brand, business model, offer, audience, sources, and any conflicts. Ask me to confirm or correct it.

After I confirm, create a fresh replacement mission with playbook_id \`ads-research\`, carry forward the prior kickoff where it is still valid, and include my corrections. Do not reuse the prior mission's analysis or deliverables as factual input. Confirm "New mission created" in chat and show or link the replacement mission.`
}

export function AdsResearchRunsView({
  spaceId,
  campaignId,
}: {
  spaceId: string
  campaignId: string | null
}) {
  const [runs, setRuns] = useState<Mission[]>([])
  const [deliverables, setDeliverables] = useState<Record<string, MissionDeliverable[]>>({})
  const [selectedRun, setSelectedRun] = useState<Mission | null>(null)
  const [missionModalOpen, setMissionModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const openFreshChatDrawer = useShellStore((state) => state.openFreshChatDrawer)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const missions = await fetchMissions({
        space_id: spaceId,
        campaign_id: campaignId ?? undefined,
      })
      const researchRuns = missions.filter(
        (mission) => mission.input?.playbook_id === 'ads-research',
      )
      setRuns(researchRuns)
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

  const startResearch = () => {
    if (!campaignId) {
      toast.error(ADS_RESEARCH_MESSAGES.NO_CAMPAIGN)
      return
    }
    openFreshChatDrawer()
    seedComposer({
      content: RESEARCH_INTAKE_PROMPT,
      agentKey: 'ads_manager',
      railIntent: 'new',
      workContext: { surface: 'spaces', spaceId, campaignId },
    })
  }

  const rerunResearch = (run: Mission) => {
    if (!campaignId) {
      toast.error(ADS_RESEARCH_MESSAGES.NO_CAMPAIGN)
      return
    }
    openFreshChatDrawer()
    seedComposer({
      content: buildResearchRerunPrompt(run),
      agentKey: 'ads_manager',
      railIntent: 'new',
      workContext: { surface: 'spaces', spaceId, campaignId },
    })
  }

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
          onRerun={() => rerunResearch(selectedRun)}
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
            disabled={!campaignId}
            onClick={startResearch}
          >
            <Sparkles className="icon-sm" />
            {ADS_RESEARCH_MESSAGES.RUN_BUTTON}
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
                onOpen={() => setSelectedRun(run)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
