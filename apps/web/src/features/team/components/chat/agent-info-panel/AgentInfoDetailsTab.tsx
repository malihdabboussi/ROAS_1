import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronDown, X } from 'lucide-react'
import { CAMPAIGN_CORE_AGENT_KEYS } from '../../../constants/team.constants'
import { clampDropdownLeft } from '../../../lib/clamp-dropdown-left'
import type { AgentInfoPanelProps } from './agent-info-panel.types'

export type AgentInfoDetailsTabProps = Pick<
  AgentInfoPanelProps,
  | 'selected'
  | 'level'
  | 'isSystemLikeAgent'
  | 'bio'
  | 'blockedCount'
  | 'activeCount'
  | 'todoCount'
  | 'totalCompleted'
  | 'completedThisMonth'
  | 'successRate'
  | 'avgCompletionRate'
  | 'missionsScored'
  | 'hasStats'
  | 'overallColor'
  | 'overall'
  | 'metrics'
  | 'stats'
  | 'hasBrain'
  | 'campaigns'
  | 'nonGeneralCampaigns'
  | 'assignedCampaigns'
  | 'campaignLoading'
  | 'campaignActionLoading'
  | 'campaignError'
  | 'handleAssignCampaign'
  | 'handleUnassignCampaign'
  | 'isSelectedRemovable'
  | 'isSelectedManager'
  | 'setFireError'
  | 'setShowFireConfirm'
  | 'selectedAgentKey'
  | 'managementDisabled'
>

export function AgentInfoDetailsTab(props: AgentInfoDetailsTabProps) {
  const {
    selected,
    level,
    isSystemLikeAgent,
    bio,
    blockedCount,
    activeCount,
    todoCount,
    totalCompleted,
    completedThisMonth,
    successRate,
    avgCompletionRate,
    missionsScored,
    hasStats,
    overallColor,
    overall,
    metrics,
    stats,
    hasBrain,
    campaigns,
    nonGeneralCampaigns,
    assignedCampaigns,
    campaignLoading,
    campaignActionLoading,
    campaignError,
    handleAssignCampaign,
    handleUnassignCampaign,
    isSelectedRemovable,
    isSelectedManager,
    setFireError,
    setShowFireConfirm,
    selectedAgentKey,
    managementDisabled,
  } = props

  const campaignDropdownWrapRef = useRef<HTMLDivElement>(null)
  const campaignDropdownBtnRef = useRef<HTMLButtonElement>(null)
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false)
  const [campaignDropdownPos, setCampaignDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    setCampaignMenuOpen(false)
  }, [selected?.agent_key])

  useLayoutEffect(() => {
    if (!campaignMenuOpen) {
      setCampaignDropdownPos({ top: 0, left: 0, width: 0 })
      return
    }
    if (!campaignDropdownBtnRef.current) return
    const rect = campaignDropdownBtnRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const width = Math.max(rect.width, 192)
    setCampaignDropdownPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [campaignMenuOpen])

  useEffect(() => {
    if (!campaignMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (campaignDropdownWrapRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-agent-info-campaign-dropdown]')) return
      setCampaignMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [campaignMenuOpen])

  if (!selected) return null

  const campaignDropdownReady =
    campaignDropdownPos.width > 0 && campaignDropdownPos.top > 0 && campaignDropdownPos.left > 0

  return (
    <div className="gap-spacing-3 px-spacing-3 pb-spacing-3 flex flex-col">
      {bio && <p className="body-3 text-muted-foreground/70 italic">{bio}</p>}

      <div className="gap-spacing-2 flex">
        <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-orange-500/20 bg-orange-500/10 text-center">
          <p className="text-lg font-bold text-orange-400">{blockedCount}</p>
          <p className="body-4 text-muted-foreground/60">Blocked</p>
        </div>
        <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-blue-500/20 bg-blue-500/10 text-center">
          <p className="text-lg font-bold text-blue-400">{activeCount}</p>
          <p className="body-4 text-muted-foreground/60">Active</p>
        </div>
        <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-emerald-500/20 bg-emerald-500/10 text-center">
          <p className="text-lg font-bold text-emerald-400">{todoCount}</p>
          <p className="body-4 text-muted-foreground/60">Todo</p>
        </div>
      </div>

      <div className="space-y-spacing-2">
        <p className="body-4 text-muted-foreground/60 uppercase tracking-wide">Evaluation</p>
        <div className="gap-spacing-2 flex">
          <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-border bg-surface-subtle text-center">
            <p className="text-foreground text-lg font-bold">{completedThisMonth}</p>
            <p className="body-4 text-muted-foreground/60">This month</p>
          </div>
          <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-border bg-surface-subtle text-center">
            <p className="text-foreground text-lg font-bold">{totalCompleted}</p>
            <p className="body-4 text-muted-foreground/60">Completed</p>
          </div>
          <div className="rounded-spacing-2 px-spacing-2 py-spacing-2 flex-1 border border-border bg-surface-subtle text-center">
            <p className="text-foreground text-lg font-bold">
              {successRate != null ? `${successRate}%` : '—'}
            </p>
            <p className="body-4 text-muted-foreground/60">Success</p>
          </div>
        </div>
        {avgCompletionRate != null && (
          <div className="rounded-spacing-2 px-spacing-3 py-spacing-2 border border-border bg-surface-subtle">
            <div className="flex items-center justify-between">
              <span className="body-4 text-muted-foreground">Avg. subtask completion</span>
              <span className="body-4 text-foreground font-medium">{avgCompletionRate}%</span>
            </div>
            <div className="progress-bar-track mt-1">
              <div className="progress-bar-fill" style={{ width: `${avgCompletionRate}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-spacing-2">
        <p className="body-4 text-muted-foreground/60 uppercase tracking-wide">Performance</p>
        {hasStats ? (
          <>
            <div className="gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center border border-border bg-surface-subtle">
              <div className={`text-3xl font-bold leading-none ${overallColor}`}>
                {overall.toFixed(1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="body-4 text-muted-foreground">Overall score</p>
                <p className="body-4 text-muted-foreground/50">
                  {missionsScored} mission{missionsScored !== 1 ? 's' : ''} scored
                </p>
              </div>
            </div>
            {metrics.map(({ key, label }) => {
              const val = (stats[key] as number | undefined) ?? 0
              return (
                <div key={key} className="gap-spacing-2 flex items-center">
                  <span className="body-4 text-muted-foreground w-16 shrink-0">{label}</span>
                  <div className="progress-bar-track flex-1">
                    <div className="progress-bar-fill" style={{ width: `${(val / 10) * 100}%` }} />
                  </div>
                  <span className="body-4 text-muted-foreground w-6 text-right">
                    {val.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </>
        ) : (
          <p className="body-4 text-muted-foreground/40 italic">
            Scores unlock after first mission
          </p>
        )}
      </div>

      {hasStats &&
        (() => {
          const GAP_THRESHOLD = 5
          const suggestions: Array<{ text: string; tab?: string }> = []
          const bc = (stats.brand_coherence as number | undefined) ?? 10
          const ia = (stats.intent_alignment as number | undefined) ?? 10
          const cr = (stats.craft as number | undefined) ?? 10
          const co = (stats.completeness as number | undefined) ?? 10

          if (bc < GAP_THRESHOLD)
            suggestions.push({
              text: 'Consider adding a brand-voice skill to strengthen brand coherence.',
              tab: 'skills',
            })
          if (ia < GAP_THRESHOLD)
            suggestions.push({
              text: 'Review recent mission briefs — the agent may need clearer instructions.',
            })
          if (cr < GAP_THRESHOLD && !hasBrain)
            suggestions.push({
              text: 'Activate an agent brain to help retain quality patterns across missions.',
              tab: 'access',
            })
          if (co < GAP_THRESHOLD)
            suggestions.push({
              text: 'Check if the agent has the right tools and integrations for assigned tasks.',
              tab: 'skills',
            })

          if (suggestions.length === 0) return null
          return (
            <div className="rounded-spacing-2 space-y-spacing-2 p-spacing-3 border border-orange-500/20 bg-orange-500/10">
              <p className="typo-caption text-muted-foreground/60 uppercase tracking-wide">
                Improvement suggestions
              </p>
              {suggestions.map((s, i) => (
                <div key={i} className="gap-spacing-2 flex items-start">
                  <AlertTriangle className="icon-sm mt-0.5 shrink-0 text-orange-400" />
                  <p className="body-4 text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          )
        })()}

      {!(level === 'system' || isSystemLikeAgent) && (
        <>
          {(level === 'manager' || level === 'employee') && (
            <div className="space-y-spacing-2">
              <div className="gap-spacing-2 flex items-center">
                <p className="body-4 text-muted-foreground/60 shrink-0 uppercase tracking-wide">
                  Campaigns
                </p>
                <div ref={campaignDropdownWrapRef} className="relative min-w-0 flex-1">
                  <button
                    ref={campaignDropdownBtnRef}
                    type="button"
                    onClick={() => setCampaignMenuOpen((prev) => !prev)}
                    disabled={managementDisabled || campaignActionLoading || campaigns.length === 0}
                    aria-haspopup="listbox"
                    aria-expanded={campaignMenuOpen}
                    className="surface-card border-border rounded-spacing-2 body-3 text-foreground px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors disabled:opacity-50"
                  >
                    <span className="text-muted-foreground truncate">Assign to campaign...</span>
                    <ChevronDown
                      className={`icon-sm text-muted-foreground shrink-0 transition-transform ${campaignMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {campaignMenuOpen &&
                    campaignDropdownReady &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        data-agent-info-campaign-dropdown
                        className="z-dropdown rounded-spacing-2 fixed shadow-lg"
                        style={{
                          top: campaignDropdownPos.top,
                          left: campaignDropdownPos.left,
                          width: campaignDropdownPos.width,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div
                          className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-[200px] overflow-y-auto"
                          style={{ scrollbarWidth: 'none' }}
                        >
                          <div className="space-y-spacing-1">
                            {nonGeneralCampaigns
                              .filter(
                                (campaign) => !assignedCampaigns.some((a) => a.id === campaign.id),
                              )
                              .map((campaign) => (
                                <button
                                  key={campaign.id}
                                  type="button"
                                  onClick={() => {
                                    setCampaignMenuOpen(false)
                                    void handleAssignCampaign(campaign.id)
                                  }}
                                  className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center text-left"
                                >
                                  <span className="truncate">{campaign.name}</span>
                                </button>
                              ))}
                            {nonGeneralCampaigns.filter(
                              (c) => !assignedCampaigns.some((a) => a.id === c.id),
                            ).length === 0 && (
                              <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-2">
                                All campaigns assigned
                              </p>
                            )}
                          </div>
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>
              </div>
              {campaignLoading ? (
                <p className="body-4 text-muted-foreground">Loading campaign assignments...</p>
              ) : assignedCampaigns.length > 0 ? (
                <div className="gap-spacing-2 flex flex-wrap">
                  {assignedCampaigns.map((campaign) => (
                    <span
                      key={campaign.id}
                      className="badge-glass badge-glass-muted body-4 gap-spacing-2 px-spacing-3 py-spacing-1 inline-flex items-center"
                    >
                      <span>{campaign.name}</span>
                      {!managementDisabled && !CAMPAIGN_CORE_AGENT_KEYS.has(selectedAgentKey) ? (
                        <button
                          type="button"
                          onClick={() => void handleUnassignCampaign(campaign.id)}
                          disabled={campaignActionLoading}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${campaign.name}`}
                        >
                          <X className="icon-xs" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="body-4 text-muted-foreground">No campaign assignments yet.</p>
              )}
              {campaignError && <p className="body-4 text-red-400">{campaignError}</p>}
            </div>
          )}

          {!managementDisabled && isSelectedRemovable && (
            <div className="space-y-spacing-2">
              <p className="body-4 text-muted-foreground/60 uppercase tracking-wide">Employment</p>
              <button
                type="button"
                onClick={() => {
                  setFireError(null)
                  setShowFireConfirm(true)
                }}
                className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 w-full text-left"
              >
                {isSelectedManager ? 'Remove manager' : 'Fire employee'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
