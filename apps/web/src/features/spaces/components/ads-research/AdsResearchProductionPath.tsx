'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Circle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  completeHumanMissionSubtask,
  createMission,
  fetchMissions,
  fetchSubtasks,
  type Mission,
  type MissionDeliverable,
  type MissionSubtask,
} from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import {
  buildAdsResearchApprovalSummary,
  extractAdsResearchConcepts,
  findAdsResearchApprovalGate,
  type AdsResearchConcept,
  type AdsResearchProductionRoute,
} from '../../lib/ads-research-production'
import { buildMetaAdsLaunchMissionPayload } from '../playbooks/meta-ads-launch'

interface AdsResearchProductionPathProps {
  run: Mission
  deliverables: MissionDeliverable[]
  spaceId: string
  onOpenRecommendations: (deliverable: MissionDeliverable) => void
}

function findRecommendations(deliverables: MissionDeliverable[]): MissionDeliverable | undefined {
  return deliverables.find((deliverable) =>
    /ADS-R#3|Recommended Ads and Draft Copy/i.test(deliverable.title),
  )
}

function sourceMissionId(mission: Mission): string | null {
  const kickoff =
    mission.input?.playbook_kickoff && typeof mission.input.playbook_kickoff === 'object'
      ? (mission.input.playbook_kickoff as Record<string, unknown>)
      : null
  return typeof kickoff?.source_mission_id === 'string' ? kickoff.source_mission_id : null
}

function progressForLaunch(subtasks: MissionSubtask[]) {
  const manifest = subtasks.find((subtask) => /reconcile Meta launch assets/i.test(subtask.title))
  const build = subtasks.find((subtask) => /build paused Meta campaign/i.test(subtask.title))
  const activation = subtasks.find((subtask) =>
    /review paused build and activate/i.test(subtask.title),
  )
  return {
    creative: manifest?.status === 'done',
    build: build?.status === 'done',
    launch: activation?.status === 'done',
  }
}

export function AdsResearchProductionPath({
  run,
  deliverables,
  spaceId,
  onOpenRecommendations,
}: AdsResearchProductionPathProps) {
  const recommendations = useMemo(() => findRecommendations(deliverables), [deliverables])
  const concepts = useMemo(() => extractAdsResearchConcepts(recommendations), [recommendations])
  const [selected, setSelected] = useState<Record<string, AdsResearchConcept>>({})
  const [gate, setGate] = useState<MissionSubtask | null>(null)
  const [launchMission, setLaunchMission] = useState<Mission | null>(null)
  const [launchSubtasks, setLaunchSubtasks] = useState<MissionSubtask[]>([])
  const [loadingWorkflow, setLoadingWorkflow] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      fetchSubtasks(run.id),
      fetchMissions({
        space_id: spaceId,
        campaign_id: run.campaign_id ?? undefined,
      }),
    ])
      .then(async ([researchSubtasks, missions]) => {
        if (!active) return
        setGate(findAdsResearchApprovalGate(researchSubtasks) ?? null)
        const related =
          missions.find(
            (mission) =>
              mission.input?.playbook_id === 'meta-ads-launch' &&
              sourceMissionId(mission) === run.id,
          ) ?? null
        setLaunchMission(related)
        if (related) {
          const relatedSubtasks = await fetchSubtasks(related.id)
          if (active) setLaunchSubtasks(relatedSubtasks)
        }
      })
      .catch(() => {
        if (active) toast.error(ADS_RESEARCH_MESSAGES.PRODUCTION_LOAD_FAILED)
      })
      .finally(() => {
        if (active) setLoadingWorkflow(false)
      })
    return () => {
      active = false
    }
  }, [run.campaign_id, run.id, spaceId])

  const launchProgress = progressForLaunch(launchSubtasks)
  const approvalDone = gate?.status === 'done' || Boolean(launchMission)
  const productionSteps = [
    { label: 'Select concepts', done: approvalDone },
    { label: 'Approve scripts', done: approvalDone },
    { label: 'Record or design', done: launchProgress.creative },
    { label: 'Build ads', done: launchProgress.build },
    { label: 'Launch', done: launchProgress.launch },
  ]

  const toggleConcept = (concept: AdsResearchConcept) => {
    setSelected((current) => {
      const next = { ...current }
      if (next[concept.id]) delete next[concept.id]
      else next[concept.id] = concept
      return next
    })
  }

  const setRoute = (concept: AdsResearchConcept, route: AdsResearchProductionRoute) => {
    setSelected((current) => ({
      ...current,
      [concept.id]: { ...(current[concept.id] ?? concept), route },
    }))
  }

  const startProduction = async () => {
    const approvedConcepts = Object.values(selected)
    if (approvedConcepts.length === 0 || !run.campaign_id || !gate) return
    setSubmitting(true)
    const summary = buildAdsResearchApprovalSummary(approvedConcepts)
    let approvalSaved = gate?.status === 'done'
    try {
      if (gate && gate.status !== 'done') {
        await completeHumanMissionSubtask(run.id, gate.id, summary)
        approvalSaved = true
        setGate({ ...gate, status: 'done', output: { ...gate.output, summary } })
      }
      const payload = buildMetaAdsLaunchMissionPayload({
        asset_links: '',
        ad_copy: '',
        creative_links: '',
        destination_url: '',
        notes: summary,
      })
      const kickoff = payload.input.playbook_kickoff
      const mission = await createMission({
        ...payload,
        campaign_id: run.campaign_id,
        space_id: spaceId,
        idempotency_key: `ads-research-production-${run.id}`,
        input: {
          ...payload.input,
          playbook_kickoff: {
            ...kickoff,
            source_mission_id: run.id,
            source_deliverable_ids: deliverables.map((deliverable) => deliverable.id),
            approved_concepts: approvedConcepts,
          },
        },
      })
      setLaunchMission(mission)
      setLaunchSubtasks(await fetchSubtasks(mission.id).catch(() => []))
      toast.success(ADS_RESEARCH_MESSAGES.PRODUCTION_STARTED)
    } catch {
      toast.error(
        approvalSaved
          ? ADS_RESEARCH_MESSAGES.PRODUCTION_START_FAILED
          : ADS_RESEARCH_MESSAGES.APPROVAL_FAILED,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="surface-card border-border p-spacing-4 gap-spacing-4 rounded-spacing-3 flex flex-col border">
      <div className="gap-spacing-2 flex items-center">
        <Sparkles className="icon-sm text-primary" />
        <div>
          <h3 className="body-2 text-foreground font-semibold">PRODUCTION PATH</h3>
          <p className="body-4 text-muted-foreground">
            Approve the concepts here. The handoff then continues as a tracked Meta Ads Launch
            mission.
          </p>
        </div>
      </div>

      <ol className="gap-spacing-2 grid sm:grid-cols-5">
        {productionSteps.map((step, index) => (
          <li
            key={step.label}
            className={cn(
              'border-border p-spacing-3 gap-spacing-2 rounded-spacing-2 flex items-center border',
              step.done ? 'bg-hover-subtle' : 'bg-secondary',
            )}
          >
            {step.done ? (
              <Check className="icon-sm text-success shrink-0" />
            ) : (
              <Circle className="icon-sm text-muted-foreground shrink-0" />
            )}
            <span className="body-4 text-foreground font-medium">
              {index + 1}. {step.label}
            </span>
          </li>
        ))}
      </ol>

      {!launchMission ? (
        <div className="gap-spacing-3 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="body-2 text-foreground font-semibold">Select concepts to produce</p>
            {recommendations ? (
              <button
                type="button"
                className="button-ghost button-compact"
                onClick={() => onOpenRecommendations(recommendations)}
              >
                Read full recommendations
              </button>
            ) : null}
          </div>
          {concepts.length > 0 ? (
            <div className="gap-spacing-2 grid lg:grid-cols-2">
              {concepts.map((concept) => {
                const checked = Boolean(selected[concept.id])
                return (
                  <div
                    key={concept.id}
                    className={cn(
                      'border-border p-spacing-3 gap-spacing-3 rounded-spacing-2 flex items-center border',
                      checked ? 'bg-hover-subtle' : 'bg-secondary',
                    )}
                  >
                    <button
                      type="button"
                      className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
                      aria-pressed={checked}
                      onClick={() => toggleConcept(concept)}
                    >
                      {checked ? (
                        <Check className="icon-sm text-primary shrink-0" />
                      ) : (
                        <Circle className="icon-sm text-muted-foreground shrink-0" />
                      )}
                      <span className="body-3 text-foreground truncate font-medium">
                        {concept.title}
                      </span>
                    </button>
                    {checked ? (
                      <select
                        className="input-glass body-4"
                        aria-label={`Production route for ${concept.title}`}
                        value={selected[concept.id]?.route ?? concept.route}
                        onChange={(event) =>
                          setRoute(concept, event.target.value as AdsResearchProductionRoute)
                        }
                      >
                        <option value="recording">Recording</option>
                        <option value="design">Design</option>
                      </select>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="body-3 text-muted-foreground">
              Open the recommendations, choose the concepts to advance, then return here to start
              production.
            </p>
          )}
          <button
            type="button"
            className="button-glass-primary gap-spacing-2 inline-flex items-center self-start"
            disabled={Object.keys(selected).length === 0 || loadingWorkflow || !gate || submitting}
            onClick={() => void startProduction()}
          >
            {loadingWorkflow
              ? 'Loading production path…'
              : submitting
                ? 'Starting production…'
                : 'Approve and start production'}
            <ArrowRight className="icon-sm" />
          </button>
        </div>
      ) : (
        <div className="bg-hover-subtle border-border p-spacing-3 rounded-spacing-2 border">
          <p className="body-2 text-foreground font-semibold">Meta Ads Launch started</p>
          <p className="body-4 text-muted-foreground">
            Blaze is reconciling the approved copy and creative. The remaining steps update from
            that mission.
          </p>
        </div>
      )}
    </section>
  )
}
