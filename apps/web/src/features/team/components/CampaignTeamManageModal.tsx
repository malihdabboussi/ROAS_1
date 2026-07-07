'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Plus, UserMinus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  AGENT_FULL_TITLES,
  AGENT_KEY_TO_TEAM,
  AGENT_THEME_BADGE,
  AGENT_THEME_LABELS,
} from '@/app/(dashboard)/campaigns/[id]/_lib/constants'
import type { CampaignContext } from '@/app/(dashboard)/campaigns/[id]/_lib/types'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchMissionAgents,
  fetchReadyEmployeeLibrary,
} from '@/features/mission-control/services/missions.service'
import type { MissionAgent, ReadyEmployeeProfile } from '@/features/mission-control/types'
import { ResizableDivider } from '@/features/studio/components/layout/ResizableDivider'
import { usePanelResize } from '@/features/studio/hooks/usePanelResize'
import {
  assignAgentToCampaign,
  fetchCampaign,
  unassignAgentFromCampaign,
  updateCampaign,
  type CampaignTeamAgent,
} from '@/features/studio/services/campaign.service'
import {
  createNewConversation,
  fetchMessages,
  sendMessageStreaming,
} from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { CAMPAIGN_CORE_AGENT_KEYS } from '@/features/team/constants/team.constants'

interface HrGap {
  gap: string
  severity: 'critical' | 'high' | 'medium'
  evidence: string
}

interface HrInsightsData {
  team_gaps: HrGap[]
  team_structure: {
    summary: string
    strengths: string[]
    improvements: string[]
  }
  cascade_hires: { agent_key: string; reason: string }[]
}

interface CampaignTeamManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  campaignName: string
  campaignTeam: CampaignTeamAgent[]
  onTeamChange: () => void
  context: CampaignContext
  createdSummary: string
}

export function CampaignTeamManageModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  campaignTeam,
  onTeamChange,
  context,
  createdSummary,
}: CampaignTeamManageModalProps) {
  const [allAgents, setAllAgents] = useState<MissionAgent[]>([])
  const [profiles, setProfiles] = useState<ReadyEmployeeProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [hrInsightsLoading, setHrInsightsLoading] = useState(false)
  const [hrInsights, setHrInsights] = useState<HrInsightsData | null>(null)
  const [campaignConfig, setCampaignConfig] = useState<Record<string, unknown>>({})
  const [detailAgent, setDetailAgent] = useState<MissionAgent | null>(null)
  const [isMobileManage, setIsMobileManage] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [hrCollapsed, setHrCollapsed] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobileManage(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) setMobileView('list')
  }, [open])

  const {
    chatWidthPercent: libraryWidthPercent,
    isDragging,
    containerRef,
    handleMouseDown,
  } = usePanelResize({ defaultWidthPercent: 68, minPercent: 50, maxPercent: 80 })

  const recommendedKeys = useMemo(
    () => hrInsights?.cascade_hires.map((h) => h.agent_key) ?? [],
    [hrInsights],
  )

  const profileByAgentKey = useMemo(() => {
    const map = new Map<string, ReadyEmployeeProfile>()
    for (const p of profiles) {
      map.set(p.role_key, p)
    }
    return map
  }, [profiles])

  const profileByRole = useMemo(() => {
    const map = new Map<string, ReadyEmployeeProfile>()
    for (const p of profiles) {
      map.set(p.role.toLowerCase(), p)
    }
    return map
  }, [profiles])

  /** Only match ready-library rows by template role_key or exact library role title — never by capability_domain (custom hires share domains and would show the wrong template, e.g. Viktor widgets on Aria). */
  const resolveReadyLibraryProfile = (agent: MissionAgent): ReadyEmployeeProfile | undefined =>
    profileByAgentKey.get(agent.agent_key) ??
    (agent.role ? profileByRole.get(agent.role.toLowerCase()) : undefined)

  const teamAgentKeys = new Set(campaignTeam.map((a) => a.agent_key))
  // Include system-level agents (Atlas, Viktor, HR): they exist in agents_registry with level
  // `system` but must still appear here so users can see core team members and add/remove others.
  const potentialAgents = allAgents.filter((a) => !teamAgentKeys.has(a.agent_key))
  const teamAgents = allAgents.filter((a) => teamAgentKeys.has(a.agent_key))

  const highlightedHire = useMemo(() => {
    const potentialKeys = new Set(potentialAgents.map((a) => a.agent_key))
    const topKey = recommendedKeys.find((k) => potentialKeys.has(k))
    if (!topKey) return null
    const agent = potentialAgents.find((a) => a.agent_key === topKey) ?? null
    const reason = hrInsights?.cascade_hires.find((h) => h.agent_key === topKey)?.reason ?? ''
    return agent ? { agent, reason } : null
  }, [recommendedKeys, potentialAgents, hrInsights])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetchMissionAgents(),
      fetchReadyEmployeeLibrary().catch(() => []),
      fetchCampaign(campaignId).catch(() => null),
    ])
      .then(([agents, profs, campaign]) => {
        setAllAgents(agents)
        setProfiles(profs)
        const cfg = (campaign as { config?: Record<string, unknown> } | null)?.config ?? {}
        setCampaignConfig(cfg)
        const stored = cfg.hr_insights as HrInsightsData | undefined
        if (stored?.team_gaps) {
          setHrInsights(stored)
        }
      })
      .finally(() => setLoading(false))
  }, [open, campaignId])

  const handleAdd = useCallback(
    async (agentKey: string) => {
      setActionLoading(agentKey)
      try {
        await assignAgentToCampaign(campaignId, agentKey)
        onTeamChange()
      } finally {
        setActionLoading(null)
      }
    },
    [campaignId, onTeamChange],
  )

  const handleRemove = useCallback(
    async (agentKey: string) => {
      setActionLoading(agentKey)
      try {
        await unassignAgentFromCampaign(campaignId, agentKey)
        onTeamChange()
      } finally {
        setActionLoading(null)
      }
    },
    [campaignId, onTeamChange],
  )

  const hrAgent = useMemo(() => allAgents.find((a) => a.agent_key === 'hr'), [allAgents])

  const handleGetHrInsights = useCallback(async () => {
    if (!hrAgent) return
    setHrInsightsLoading(true)
    try {
      const conv = await createNewConversation({
        title: 'HR Insights',
        agent_id: hrAgent.id,
        campaign_id: campaignId,
      })
      const currentTeamLines =
        teamAgents.length > 0
          ? teamAgents.map((a) => `- ${a.name} (${a.role})`).join('\n')
          : '(none)'
      const availableLines =
        potentialAgents.length > 0
          ? potentialAgents.map((a) => `- ${a.agent_key}: ${a.name} (${a.role})`).join('\n')
          : '(none)'

      const parts: string[] = [
        `You are reviewing the "${campaignName}" campaign as an HR strategist. Analyze the team and give structured insights.`,
        '',
        '**Strategy:**',
        context.strategy || '(none)',
        '',
        '**Result:**',
        context.result || '(none)',
        '',
        '**Purpose:**',
        context.purpose || '(none)',
        '',
        '**What was created:**',
        createdSummary || '(none)',
        '',
        '**Current team:**',
        currentTeamLines,
        '',
        '**Available to hire:**',
        availableLines,
        '',
        'Respond ONLY with a valid JSON object — no markdown, no explanation, no text outside the JSON.',
        'Use this exact schema:',
        '{',
        '  "team_gaps": [',
        '    { "gap": "short gap name", "severity": "critical|high|medium", "evidence": "one sentence why" }',
        '  ],',
        '  "team_structure": {',
        '    "summary": "2-3 sentence overall assessment",',
        '    "strengths": ["strength 1", "strength 2"],',
        '    "improvements": ["improvement 1", "improvement 2"]',
        '  },',
        '  "cascade_hires": [',
        '    { "agent_key": "agent_key_from_available_list", "reason": "one sentence why this is the top hire" },',
        '    { "agent_key": "...", "reason": "..." },',
        '    { "agent_key": "...", "reason": "..." }',
        '  ]',
        '}',
      ]
      await sendMessageStreaming({
        conversation_id: conv.id,
        campaign_id: campaignId,
        content: parts.join('\n'),
      })
      const messages = await fetchMessages(conv.id, { limit: 20 })
      const latestAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && (m.content ?? '').trim().length > 0)
      const content = latestAssistant?.content?.trim() ?? ''
      const normalized = content.toLowerCase()
      const isOverloaded =
        normalized.includes('temporarily overloaded') ||
        normalized.includes('try again in a moment')
      if (!content || isOverloaded) {
        throw new Error('__HR_INSIGHTS_EMPTY__')
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('__HR_INSIGHTS_EMPTY__')
      const parsed = JSON.parse(jsonMatch[0]) as HrInsightsData

      const newConfig = { ...campaignConfig, hr_insights: parsed }
      await updateCampaign(campaignId, { config: newConfig })
      setCampaignConfig(newConfig)
      setHrInsights(parsed)
    } catch (err) {
      if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
        useChatStore.getState().setCreditsExhausted(true)
        return
      }
      toast.error('HR insights are unavailable right now. Please try again.')
      console.error('HR insights call failed:', err)
    } finally {
      setHrInsightsLoading(false)
    }
  }, [hrAgent, campaignId, context, createdSummary, teamAgents, potentialAgents, campaignConfig])

  const themeLabel = (agent: MissionAgent) =>
    agent.level === 'c_level' || agent.level === 'manager'
      ? (AGENT_THEME_LABELS[agent.level] ?? agent.level)
      : (AGENT_THEME_LABELS[
          (agent.config as Record<string, string> | undefined)?.capability_domain ?? ''
        ] ??
        AGENT_KEY_TO_TEAM[agent.agent_key] ??
        'Operations')

  const displayLabel = (agent: MissionAgent) => {
    const theme = themeLabel(agent)
    const fullTitle = agent.level === 'c_level' && AGENT_FULL_TITLES[agent.agent_key]
    if (fullTitle) {
      const acronym = agent.agent_key.toUpperCase()
      return `${acronym} (${fullTitle})`
    }
    return theme
  }

  const renderAgentCard = (
    agent: MissionAgent,
    action: { type: 'add' | 'remove'; onClick: () => void; disabled: boolean } | null,
  ) => {
    const label = themeLabel(agent)
    const labelText = displayLabel(agent)
    const profile = resolveReadyLibraryProfile(agent)
    const fromLibrary = profile?.responsibilities?.slice(0, 3) ?? []
    const fromSkills = (agent.skills ?? []).slice(0, 3)
    const cardBullets = fromLibrary.length > 0 ? fromLibrary : fromSkills

    return (
      <div
        key={agent.id}
        className="card-glass-panel rounded-spacing-2 flex flex-col gap-3 border-0 px-3 py-3"
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-stretch gap-3">
            <div className="shrink-0">
              {agent.image_url ? (
                <div className="h-9 w-9 overflow-hidden rounded-full">
                  <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="bg-primary/20 flex h-9 w-9 items-center justify-center rounded-full">
                  <span className="text-primary text-xs font-bold">{agent.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex min-h-9 min-w-0 flex-1 flex-col justify-center gap-0">
              <p className="body-3 text-foreground truncate font-medium leading-tight">
                {agent.name}
              </p>
              <p className="body-3 text-muted-foreground truncate leading-tight">{agent.role}</p>
            </div>
          </div>
          <span
            className={`body-3 shrink-0 self-start font-medium ${AGENT_THEME_BADGE[label] ?? 'badge-glass badge-glass-sm badge-glass-muted'}`}
          >
            {labelText}
          </span>
        </div>
        {cardBullets.length > 0 && (
          <ul className="space-y-0.5">
            {cardBullets.map((r) => (
              <li
                key={r}
                className="body-3 text-muted-foreground line-clamp-2 flex items-start gap-1.5"
              >
                <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDetailAgent(agent)}
            className="body-3 text-primary hover:underline"
          >
            Learn more
          </button>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="btn-icon-glass rounded-spacing-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground disabled:opacity-50"
              aria-label={action.type === 'add' ? `Add ${agent.name}` : `Remove ${agent.name}`}
            >
              {action.type === 'add' ? (
                <Plus className="icon-xs" />
              ) : (
                <UserMinus className="icon-xs" />
              )}
            </button>
          ) : (
            <span className="body-3 text-muted-foreground shrink-0">Always on campaign</span>
          )}
        </div>
      </div>
    )
  }

  if (isMobileManage && open) {
    const mobileDetailProfile = detailAgent ? resolveReadyLibraryProfile(detailAgent) : undefined

    return createPortal(
      <div className="fixed inset-0 z-[999] flex flex-col bg-[var(--color-background)]">
        {mobileView === 'detail' && detailAgent ? (
          <>
            <div className="flex items-center gap-3 px-3 pb-1 pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileView('list')
                  setDetailAgent(null)
                }}
                className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
                {detailAgent.name}
              </span>
              <div className="w-spacing-8" />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="gap-spacing-3 flex items-start">
                {detailAgent.image_url ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    <img
                      src={detailAgent.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-primary/20 flex h-16 w-16 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary text-xl font-bold">
                      {detailAgent.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="mb-spacing-1 gap-spacing-1 flex flex-wrap items-center">
                    <span
                      className={`body-4 font-medium ${AGENT_THEME_BADGE[themeLabel(detailAgent)] ?? 'badge-glass badge-glass-sm badge-glass-muted'}`}
                    >
                      {displayLabel(detailAgent)}
                    </span>
                  </div>
                  <h3 className="text-foreground text-xl font-bold uppercase">
                    {detailAgent.name}
                  </h3>
                  <p className="body-2 text-muted-foreground">
                    {detailAgent.role}
                    {mobileDetailProfile?.tagline ? ` · ${mobileDetailProfile.tagline}` : ''}
                  </p>
                  {mobileDetailProfile?.disc_profile && (
                    <p className="body-3 text-muted-foreground mt-spacing-1">
                      DISC: {mobileDetailProfile.disc_profile}
                    </p>
                  )}
                </div>
              </div>

              {mobileDetailProfile?.description && (
                <p className="body-2 text-muted-foreground mt-spacing-4">
                  {mobileDetailProfile.description}
                </p>
              )}

              {(mobileDetailProfile?.responsibilities ?? []).length > 0 && (
                <div className="mt-spacing-4">
                  <p className="body-3 text-foreground font-semibold uppercase">Responsibilities</p>
                  <ul className="mt-spacing-2 space-y-1">
                    {mobileDetailProfile!.responsibilities.map((r) => (
                      <li key={r} className="body-3 text-muted-foreground flex items-start gap-2">
                        <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(mobileDetailProfile?.core_beliefs ?? []).length > 0 && (
                <div className="mt-spacing-4">
                  <p className="body-3 text-foreground font-semibold uppercase">Mindset</p>
                  <ul className="mt-spacing-2 space-y-spacing-2">
                    {mobileDetailProfile!.core_beliefs.map((belief) => (
                      <li
                        key={belief}
                        className="body-3 text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary/60 mt-0.5 shrink-0 text-xs">&#x2756;</span>
                        &ldquo;{belief}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-spacing-4">
                <p className="body-3 text-foreground font-semibold uppercase">Skill Library</p>
                <div className="mt-spacing-2 space-y-spacing-2">
                  {(mobileDetailProfile?.skill_profiles ?? []).length > 0 ? (
                    mobileDetailProfile!.skill_profiles.map((skill) => (
                      <div
                        key={skill.skill_key}
                        className="rounded-spacing-2 p-spacing-3 border border-border bg-surface-subtle"
                      >
                        <p className="body-3 text-foreground font-medium">{skill.name}</p>
                        <p className="body-4 text-muted-foreground">{skill.description}</p>
                      </div>
                    ))
                  ) : (detailAgent.skills ?? []).length > 0 ? (
                    detailAgent.skills!.map((s) => (
                      <div
                        key={s}
                        className="rounded-spacing-2 p-spacing-3 border border-border bg-surface-subtle"
                      >
                        <p className="body-3 text-foreground font-medium">{s}</p>
                      </div>
                    ))
                  ) : (
                    <p className="body-3 text-muted-foreground">No skills listed</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 pb-1 pt-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
                Manage Team
              </span>
              <div className="w-spacing-8" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {hrAgent && (
                <div className="px-3 pt-2">
                  <div className="card-glass-panel rounded-spacing-2 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hrInsights && !hrInsightsLoading) void handleGetHrInsights()
                        setHrCollapsed((p) => !p)
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5"
                    >
                      {hrAgent.image_url ? (
                        <img
                          src={hrAgent.image_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                          <span className="text-primary text-sm font-bold">
                            {hrAgent.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="body-3 text-foreground flex-1 text-left font-semibold">
                        HR Insights
                      </span>
                      {!hrInsights && !hrInsightsLoading && (
                        <span className="body-4 text-[var(--color-primary)]">Get Insights</span>
                      )}
                      {hrCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                      )}
                    </button>
                    {!hrCollapsed && (
                      <div className="border-t border-border px-3 py-3">
                        {hrInsightsLoading && !hrInsights ? (
                          <div className="flex items-center justify-center py-6">
                            <VibeyLoadingOrb state="processing" size="md" />
                          </div>
                        ) : hrInsights ? (
                          <div className="space-y-3">
                            <p className="body-4 text-foreground font-semibold uppercase tracking-wide">
                              Team Gaps
                            </p>
                            {hrInsights.team_gaps.map((gap, i) => (
                              <div
                                key={i}
                                className="card-glass-panel rounded-spacing-2 flex flex-col gap-1 border-0 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="body-3 text-foreground font-medium leading-tight">
                                    {gap.gap}
                                  </p>
                                  <span
                                    className={`body-4 shrink-0 font-medium ${gap.severity === 'critical' ? 'badge-glass badge-glass-sm badge-glass-red' : gap.severity === 'high' ? 'badge-glass badge-glass-sm badge-glass-orange' : 'badge-glass badge-glass-sm badge-glass-yellow'}`}
                                  >
                                    {gap.severity}
                                  </span>
                                </div>
                                <p className="body-3 text-muted-foreground leading-snug">
                                  {gap.evidence}
                                </p>
                              </div>
                            ))}
                            <p className="body-4 text-foreground mt-2 font-semibold uppercase tracking-wide">
                              Team Structure
                            </p>
                            <div className="card-glass-panel rounded-spacing-2 flex flex-col gap-2 border-0 px-3 py-2">
                              <p className="body-3 text-muted-foreground leading-snug">
                                {hrInsights.team_structure.summary}
                              </p>
                              {hrInsights.team_structure.strengths.length > 0 && (
                                <div>
                                  <p className="body-4 text-foreground mb-1 font-medium">
                                    Strengths
                                  </p>
                                  {hrInsights.team_structure.strengths.map((s, i) => (
                                    <div key={i} className="mb-0.5 flex items-start gap-1.5">
                                      <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                                      <p className="body-3 text-muted-foreground leading-snug">
                                        {s}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {hrInsights.team_structure.improvements.length > 0 && (
                                <div>
                                  <p className="body-4 text-foreground mb-1 font-medium">
                                    Improvements
                                  </p>
                                  {hrInsights.team_structure.improvements.map((s, i) => (
                                    <div key={i} className="mb-0.5 flex items-start gap-1.5">
                                      <span className="indicator-dot-glass indicator-dot-glass-orange mt-1 shrink-0" />
                                      <p className="body-3 text-muted-foreground leading-snug">
                                        {s}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {highlightedHire && (
                              <>
                                <p className="body-4 text-foreground mt-2 font-semibold uppercase tracking-wide">
                                  Next Hire
                                </p>
                                <div className="chip-glass-orange rounded-spacing-2 flex items-center gap-2 px-3 py-3">
                                  {highlightedHire.agent.image_url ? (
                                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                      <img
                                        src={highlightedHire.agent.image_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                                      <span className="text-primary text-xs font-bold">
                                        {highlightedHire.agent.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="body-3 text-foreground truncate font-medium">
                                      {highlightedHire.agent.name}
                                    </p>
                                    <p className="body-4 text-muted-foreground">
                                      {highlightedHire.reason}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleAdd(highlightedHire.agent.agent_key)}
                                    disabled={actionLoading === highlightedHire.agent.agent_key}
                                    className="btn-icon-glass rounded-spacing-3 shrink-0 disabled:opacity-50"
                                    aria-label={`Add ${highlightedHire.agent.name}`}
                                  >
                                    <Plus className="icon-xs" />
                                  </button>
                                </div>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleGetHrInsights()}
                              disabled={hrInsightsLoading}
                              className="button-glass-primary body-3 mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-medium"
                            >
                              {hrInsightsLoading ? 'Refreshing...' : 'Refresh Insights'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
                              <p className="body-3 text-muted-foreground blur-sm">
                                Lorem ipsum dolor sit amet consectetur adipiscing.
                              </p>
                            </div>
                            <div className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
                              <p className="body-3 text-muted-foreground blur-sm">
                                Ut enim ad minim veniam quis nostrud.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <VibeyLoadingOrb size="sm" text="Loading..." />
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="body-2 text-foreground mb-2 font-semibold">
                        Team members ({teamAgents.length})
                      </h3>
                      {teamAgents.length === 0 ? (
                        <p className="body-3 text-muted-foreground">No team members yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {teamAgents.map((agent) => {
                            const label = themeLabel(agent)
                            return (
                              <div
                                key={agent.id}
                                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-subtle p-3"
                              >
                                {agent.image_url ? (
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                                    <img
                                      src={agent.image_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                    <span className="text-primary text-xs font-bold">
                                      {agent.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailAgent(agent)
                                    setMobileView('detail')
                                  }}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="body-2 text-foreground truncate font-semibold">
                                    {agent.name}
                                  </p>
                                  <p className="body-4 text-muted-foreground truncate">
                                    {agent.role}
                                  </p>
                                </button>
                                <span
                                  className={`body-3 shrink-0 font-medium ${AGENT_THEME_BADGE[label] ?? 'badge-glass badge-glass-sm badge-glass-muted'}`}
                                >
                                  {label}
                                </span>
                                {CAMPAIGN_CORE_AGENT_KEYS.has(agent.agent_key) ? (
                                  <span className="body-4 text-muted-foreground shrink-0">
                                    Always on
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleRemove(agent.agent_key)}
                                    disabled={actionLoading === agent.agent_key}
                                    className="btn-icon-glass rounded-spacing-3 shrink-0 disabled:opacity-50"
                                    aria-label={`Remove ${agent.name}`}
                                  >
                                    <UserMinus className="icon-xs" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="body-2 text-foreground mb-2 font-semibold">
                        Add members ({potentialAgents.length})
                      </h3>
                      {potentialAgents.length === 0 ? (
                        <p className="body-3 text-muted-foreground">
                          All agents are already on the team.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {potentialAgents.map((agent) => {
                            const label = themeLabel(agent)
                            return (
                              <div
                                key={agent.id}
                                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-subtle p-3"
                              >
                                {agent.image_url ? (
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                                    <img
                                      src={agent.image_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                    <span className="text-primary text-xs font-bold">
                                      {agent.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailAgent(agent)
                                    setMobileView('detail')
                                  }}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="body-2 text-foreground truncate font-semibold">
                                    {agent.name}
                                  </p>
                                  <p className="body-4 text-muted-foreground truncate">
                                    {agent.role}
                                  </p>
                                </button>
                                <span
                                  className={`body-3 shrink-0 font-medium ${AGENT_THEME_BADGE[label] ?? 'badge-glass badge-glass-sm badge-glass-muted'}`}
                                >
                                  {label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleAdd(agent.agent_key)}
                                  disabled={actionLoading === agent.agent_key}
                                  className="btn-icon-glass rounded-spacing-3 shrink-0 disabled:opacity-50"
                                  aria-label={`Add ${agent.name}`}
                                >
                                  <Plus className="icon-xs" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>,
      document.body,
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement)?.closest?.('[data-dropdown]')) e.preventDefault()
          }}
          className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Ready Employee Library — {campaignName}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-[90vh] min-h-[500px] w-full max-w-[1600px]">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="title-h2 text-foreground uppercase">READY EMPLOYEE LIBRARY</h2>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="btn-icon-bare rounded-spacing-3"
                  >
                    <X className="icon-md" />
                  </button>
                </div>
                <p className="body-1 text-muted-foreground mt-spacing-1">{campaignName}</p>
              </div>

              <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
                <div
                  className={`px-spacing-4 sm:px-spacing-6 py-spacing-4 min-w-0 overflow-y-auto ${isDragging ? '' : 'transition-[width] duration-150 ease-in-out'}`}
                  style={{ width: `${libraryWidthPercent}%` }}
                >
                  {loading ? (
                    <div className="flex min-h-[200px] flex-1 items-center justify-center">
                      <VibeyLoadingOrb state="processing" size="md" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="body-1 text-foreground mb-2 font-semibold">
                          Team members ({teamAgents.length})
                        </h3>
                        {teamAgents.length === 0 ? (
                          <p className="body-3 text-muted-foreground">
                            No team members yet. Add from the list below.
                          </p>
                        ) : (
                          <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {teamAgents.map((agent) =>
                              renderAgentCard(
                                agent,
                                CAMPAIGN_CORE_AGENT_KEYS.has(agent.agent_key)
                                  ? null
                                  : {
                                      type: 'remove',
                                      onClick: () => void handleRemove(agent.agent_key),
                                      disabled: actionLoading === agent.agent_key,
                                    },
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="body-1 text-foreground mb-2 font-semibold">
                          Add members ({potentialAgents.length})
                        </h3>
                        {potentialAgents.length === 0 ? (
                          <p className="body-3 text-muted-foreground">
                            All agents are already on the team.
                          </p>
                        ) : (
                          <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {potentialAgents.map((agent) =>
                              renderAgentCard(agent, {
                                type: 'add',
                                onClick: () => void handleAdd(agent.agent_key),
                                disabled: actionLoading === agent.agent_key,
                              }),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {hrAgent && (
                  <ResizableDivider onMouseDown={handleMouseDown} isDragging={isDragging} />
                )}

                {hrAgent && (
                  <div
                    className={`px-spacing-4 py-spacing-4 flex min-h-0 shrink-0 flex-col overflow-hidden ${isDragging ? '' : 'transition-[width] duration-150 ease-in-out'}`}
                    style={{ width: `${100 - libraryWidthPercent}%` }}
                  >
                    <div className="card-glass-panel rounded-spacing-2 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden border-0 px-4 py-4">
                      <div className="flex shrink-0 items-center gap-3">
                        {hrAgent.image_url ? (
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                            <img
                              src={hrAgent.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="bg-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                            <span className="text-primary text-xl font-bold">
                              {hrAgent.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="body-1 text-foreground font-semibold">HR Insights</h3>
                          <p className="body-4 text-muted-foreground">
                            Get team recommendations and top hire next
                          </p>
                        </div>
                      </div>
                      <div className="rounded-spacing-2 bg-muted/30 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                          {hrInsightsLoading && !hrInsights ? (
                            <div className="flex h-full min-h-[220px] items-center justify-center">
                              <VibeyLoadingOrb state="processing" size="md" />
                            </div>
                          ) : hrInsights ? (
                            <>
                              <p className="body-4 text-foreground font-semibold uppercase tracking-wide">
                                Team Gaps
                              </p>
                              {hrInsights.team_gaps.map((gap, i) => (
                                <div
                                  key={i}
                                  className="card-glass-panel rounded-spacing-2 flex flex-col gap-1 border-0 px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="body-3 text-foreground font-medium leading-tight">
                                      {gap.gap}
                                    </p>
                                    <span
                                      className={`body-4 shrink-0 font-medium ${gap.severity === 'critical' ? 'badge-glass badge-glass-sm badge-glass-red' : gap.severity === 'high' ? 'badge-glass badge-glass-sm badge-glass-orange' : 'badge-glass badge-glass-sm badge-glass-yellow'}`}
                                    >
                                      {gap.severity}
                                    </span>
                                  </div>
                                  <p className="body-3 text-muted-foreground leading-snug">
                                    {gap.evidence}
                                  </p>
                                </div>
                              ))}

                              <p className="body-4 text-foreground mt-2 font-semibold uppercase tracking-wide">
                                Team Structure
                              </p>
                              <div className="card-glass-panel rounded-spacing-2 flex flex-col gap-2 border-0 px-3 py-2">
                                <p className="body-3 text-muted-foreground leading-snug">
                                  {hrInsights.team_structure.summary}
                                </p>
                                {hrInsights.team_structure.strengths.length > 0 && (
                                  <div>
                                    <p className="body-4 text-foreground mb-1 font-medium">
                                      Strengths
                                    </p>
                                    {hrInsights.team_structure.strengths.map((s, i) => (
                                      <div key={i} className="mb-0.5 flex items-start gap-1.5">
                                        <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                                        <p className="body-3 text-muted-foreground leading-snug">
                                          {s}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {hrInsights.team_structure.improvements.length > 0 && (
                                  <div>
                                    <p className="body-4 text-foreground mb-1 font-medium">
                                      Improvements
                                    </p>
                                    {hrInsights.team_structure.improvements.map((s, i) => (
                                      <div key={i} className="mb-0.5 flex items-start gap-1.5">
                                        <span className="indicator-dot-glass indicator-dot-glass-orange mt-1 shrink-0" />
                                        <p className="body-3 text-muted-foreground leading-snug">
                                          {s}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
                                <p className="body-3 text-muted-foreground blur-sm">
                                  Lorem ipsum dolor sit amet consectetur adipiscing elit sed do
                                  eiusmod tempor incididunt ut labore.
                                </p>
                              </div>
                              <div className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
                                <p className="body-3 text-muted-foreground blur-sm">
                                  Ut enim ad minim veniam quis nostrud exercitation ullamco laboris
                                  nisi ut aliquip ex ea commodo consequat.
                                </p>
                              </div>
                              <div className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
                                <p className="body-3 text-muted-foreground blur-sm">
                                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                                  cillum dolore eu fugiat nulla pariatur.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        {hrInsights && (
                          <div className="shrink-0 px-3 pb-1">
                            <p className="body-4 text-foreground mb-2 font-semibold uppercase tracking-wide">
                              Next Hire
                            </p>
                            <AnimatePresence mode="wait">
                              {highlightedHire ? (
                                <motion.div
                                  key={highlightedHire.agent.agent_key}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.25 }}
                                  className="chip-glass-orange rounded-spacing-2 flex flex-col gap-2 px-3 py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    {highlightedHire.agent.image_url ? (
                                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                        <img
                                          src={highlightedHire.agent.image_url}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                                        <span className="text-primary text-xs font-bold">
                                          {highlightedHire.agent.name.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="body-3 text-foreground truncate font-medium leading-tight">
                                        {highlightedHire.agent.name}
                                      </p>
                                      <p className="body-4 text-muted-foreground truncate">
                                        {highlightedHire.agent.role}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleAdd(highlightedHire.agent.agent_key)
                                      }
                                      disabled={actionLoading === highlightedHire.agent.agent_key}
                                      className="btn-icon-glass rounded-spacing-3 shrink-0 disabled:opacity-50"
                                      aria-label={`Add ${highlightedHire.agent.name}`}
                                    >
                                      <Plus className="icon-xs" />
                                    </button>
                                  </div>
                                  {highlightedHire.reason && (
                                    <p className="body-3 text-muted-foreground leading-snug">
                                      {highlightedHire.reason}
                                    </p>
                                  )}
                                </motion.div>
                              ) : (
                                <motion.p
                                  key="all-hired"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="body-3 text-muted-foreground"
                                >
                                  All recommended hires are on the team.
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <div className="flex shrink-0 flex-col gap-1 p-3 pt-0">
                          <button
                            type="button"
                            onClick={() => void handleGetHrInsights()}
                            disabled={hrInsightsLoading}
                            className="button-glass-primary body-2 rounded-spacing-3 flex w-full items-center justify-center gap-2 px-3 py-2"
                          >
                            {hrInsightsLoading ? (
                              <VibeyLoadingOrb state="processing" size="sm" />
                            ) : (
                              <>
                                {hrInsights ? 'Refresh insights' : 'Get insights'}
                                <ExternalLink className="icon-xs" />
                              </>
                            )}
                          </button>
                          <p className="body-4 text-muted-foreground text-center">
                            {hrInsights
                              ? 'Insights based on current campaign data'
                              : 'Get insights to receive HR recommendations and top hire next'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>

        {detailAgent && (
          <DialogPrimitive.Root
            open={!!detailAgent}
            onOpenChange={(o) => !o && setDetailAgent(null)}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
              <DialogPrimitive.Content
                className="z-modal-layer-4 sm:p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
                onInteractOutside={() => setDetailAgent(null)}
              >
                <VisuallyHidden.Root>
                  <DialogPrimitive.Title>Agent details — {detailAgent.name}</DialogPrimitive.Title>
                </VisuallyHidden.Root>
                <AgentDetailCard
                  agent={detailAgent}
                  profile={resolveReadyLibraryProfile(detailAgent)}
                  themeLabel={themeLabel(detailAgent)}
                  displayLabel={displayLabel(detailAgent)}
                  onClose={() => setDetailAgent(null)}
                />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function AgentDetailCard({
  agent,
  profile,
  themeLabel,
  displayLabel,
  onClose,
}: {
  agent: MissionAgent
  profile: ReadyEmployeeProfile | undefined
  themeLabel: string
  displayLabel: string
  onClose: () => void
}) {
  const badgeClass = AGENT_THEME_BADGE[themeLabel] ?? 'badge-glass badge-glass-sm badge-glass-muted'
  const responsibilities = profile?.responsibilities ?? []
  const skillProfiles = profile?.skill_profiles ?? []
  const skills = agent.skills ?? []
  const coreBeliefs = profile?.core_beliefs ?? []

  return (
    <div className="surface-card card-elevated wizard-container-border rounded-spacing-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
      <div className="px-spacing-4 py-spacing-3 flex shrink-0 items-center justify-between border-b border-border">
        <h3 className="title-h4 text-foreground">Agent details</h3>
        <button type="button" onClick={onClose} className="btn-icon-bare rounded-spacing-3">
          <X className="icon-md" />
        </button>
      </div>
      <div className="p-spacing-4 flex-1 overflow-y-auto">
        <div className="gap-spacing-4 flex items-start">
          {agent.image_url ? (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
              <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="bg-primary/20 flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
              <span className="text-primary text-2xl font-bold">{agent.name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className={`body-4 font-medium ${badgeClass}`}>{displayLabel}</span>
            <h4 className="title-h4 text-foreground mt-spacing-1">{agent.name}</h4>
            <p className="body-2 text-muted-foreground">
              {agent.role}
              {profile?.tagline ? ` · ${profile.tagline}` : ''}
            </p>
            {profile?.disc_profile && (
              <p className="body-4 text-muted-foreground mt-spacing-1">
                DISC: {profile.disc_profile}
              </p>
            )}
          </div>
        </div>

        {profile?.description && (
          <p className="body-2 text-muted-foreground mt-spacing-4">{profile.description}</p>
        )}

        {responsibilities.length > 0 && (
          <div className="mt-spacing-4">
            <p className="body-2 text-foreground font-semibold uppercase">Responsibilities</p>
            <ul className="mt-spacing-2 space-y-1">
              {responsibilities.map((r) => (
                <li key={r} className="body-2 text-muted-foreground flex items-start gap-2">
                  <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {coreBeliefs.length > 0 && (
          <div className="mt-spacing-4">
            <p className="body-2 text-foreground font-semibold uppercase">Mindset</p>
            <ul className="mt-spacing-2 space-y-spacing-2">
              {coreBeliefs.map((belief) => (
                <li key={belief} className="body-2 text-muted-foreground flex items-start gap-2">
                  <span className="text-primary/60 mt-0.5 shrink-0 text-xs">&#x2756;</span>
                  &ldquo;{belief}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-spacing-4">
          <p className="body-2 text-foreground font-semibold uppercase">Skill Library</p>
          <div className="mt-spacing-2 space-y-spacing-2">
            {skillProfiles.length > 0 ? (
              skillProfiles.map((skill) => (
                <div
                  key={skill.skill_key}
                  className="rounded-spacing-2 p-spacing-3 border border-border bg-surface-subtle"
                >
                  <p className="body-2 text-foreground font-medium">{skill.name}</p>
                  <p className="body-3 text-muted-foreground">{skill.description}</p>
                </div>
              ))
            ) : skills.length > 0 ? (
              skills.map((s) => (
                <div
                  key={s}
                  className="rounded-spacing-2 p-spacing-3 border border-border bg-surface-subtle"
                >
                  <p className="body-2 text-foreground font-medium">{s}</p>
                </div>
              ))
            ) : (
              <p className="body-3 text-muted-foreground">No skills listed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
