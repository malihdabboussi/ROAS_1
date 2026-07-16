'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AreaChart as AreaChartIcon,
  BarChart3,
  Check,
  ChevronDown,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { MissionKanbanBoard } from '@/features/mission-control/components/board/MissionKanbanBoard'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import {
  MissionControlToolbar,
  type MissionPriorityFilter,
  type MissionSort,
  type MissionStatusFilter,
  type MissionViewMode,
} from '@/features/mission-control/components/MissionControlToolbar'
import { MissionList } from '@/features/mission-control/components/MissionList'
import { MissionQuickCapture } from '@/features/mission-control/components/MissionQuickCapture'
import { resolveMissionCreateToastMessage } from '@/features/mission-control/config/mission-control-toast-errors.config'
import { uploadMissionCreationAttachments } from '@/features/mission-control/lib/upload-mission-creation-attachments'
import { createMission } from '@/features/mission-control/services/missions.service'
import type { Mission, MissionAgent, MissionPriority } from '@/features/mission-control/types'
import { useAccountSettingsModal } from '@/features/settings/contexts/AccountSettingsModalContext'
import { billingApi } from '@/features/settings/services/billing-api'
import {
  CHAT_MAX_FILES,
  CHAT_TOAST_ERRORS,
} from '@/features/studio/config/chat-toast-errors.config'
import { fetchCampaignTeam } from '@/features/studio/services/campaign.service'
import { COMPLETION_DAYS_LABELS } from '../../_lib/constants'

interface CampaignDashboardTabProps {
  campaignId: string
  campaignName: string
  dashboardMissions: Mission[]
  dashboardAgents: MissionAgent[]
  completionChartType: 'bar' | 'area' | 'line' | 'pie'
  setCompletionChartType: (value: 'bar' | 'area' | 'line' | 'pie') => void
  chartDropdownOpen: boolean
  setChartDropdownOpen: (value: boolean) => void
  completionDays: number
  setCompletionDays: (value: number) => void
  timeframeDropdownOpen: boolean
  setTimeframeDropdownOpen: (value: boolean) => void
  onTeamChange: () => void
}

export function CampaignDashboardTab({
  campaignId,
  campaignName,
  dashboardMissions,
  dashboardAgents,
  completionChartType,
  setCompletionChartType,
  chartDropdownOpen,
  setChartDropdownOpen,
  completionDays,
  setCompletionDays,
  timeframeDropdownOpen,
  setTimeframeDropdownOpen,
  onTeamChange,
}: CampaignDashboardTabProps) {
  const router = useRouter()
  const { openAccountSettings } = useAccountSettingsModal()
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const [statusFilter, setStatusFilter] = useState<MissionStatusFilter>('open')
  const [currentSort, setCurrentSort] = useState<MissionSort>('updated_at.desc')
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<MissionViewMode>('list')
  const [priorityFilters, setPriorityFilters] = useState<MissionPriorityFilter[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [captureValue, setCaptureValue] = useState('')
  const [capturePriority, setCapturePriority] = useState<MissionPriority | null>('medium')
  const [captureFiles, setCaptureFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(null)

  const campaignMissions = dashboardMissions.filter((mission) => mission.campaign_id === campaignId)
  const blockedCount = campaignMissions.filter((mission) => mission.status === 'blocked').length
  const doneCount = campaignMissions.filter((mission) => mission.status === 'done').length

  const filteredCampaignMissions = useMemo(() => {
    let list = [...campaignMissions]

    if (statusFilter === 'done') list = list.filter((m) => m.status === 'done')
    else if (statusFilter === 'failed')
      list = list.filter((m) => m.status === 'failed' || m.status === 'dead_letter')
    else if (statusFilter === 'blocked') list = list.filter((m) => m.status === 'blocked')
    else if (statusFilter === 'archived') list = list.filter((m) => m.status === 'archived')
    else if (statusFilter === 'open')
      list = list.filter(
        (m) =>
          m.status !== 'done' &&
          m.status !== 'failed' &&
          m.status !== 'dead_letter' &&
          m.status !== 'backlog' &&
          m.status !== 'blocked' &&
          m.status !== 'archived',
      )

    if (searchValue.trim()) {
      const q = searchValue.toLowerCase()
      list = list.filter((m) => m.title.toLowerCase().includes(q))
    }

    const [field, dir] = currentSort.split('.') as [string, string]
    list.sort((a, b) => {
      let cmp = 0
      if (field === 'title') cmp = a.title.localeCompare(b.title)
      else if (field === 'created_at')
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      return dir === 'desc' ? -cmp : cmp
    })

    return list
  }, [campaignMissions, statusFilter, searchValue, currentSort])

  const campaignListItem = useMemo(
    () => [{ id: campaignId, name: campaignName }],
    [campaignId, campaignName],
  )

  const handleCaptureFilesChange = useCallback((next: File[]) => {
    if (next.length > CHAT_MAX_FILES) {
      toast.error(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
      setCaptureFiles(next.slice(0, CHAT_MAX_FILES))
      return
    }
    setCaptureFiles(next)
  }, [])

  const handleCreateMission = useCallback(async () => {
    const title = captureValue.trim()
    if (!title || !campaignId) return
    setSubmitting(true)
    try {
      let attachments: { url: string; name: string; size: number; type: string }[] = []

      if (captureFiles.length > 0) {
        attachments = await uploadMissionCreationAttachments(captureFiles, campaignId)
      }

      const mission = await createMission({
        title,
        brief: title,
        priority: capturePriority ?? 'medium',
        campaign_id: campaignId,
        idempotency_key: `mission-${crypto.randomUUID()}`,
        input: attachments.length > 0 ? { attachments } : undefined,
      })
      setCaptureValue('')
      setCaptureFiles([])
      await onTeamChange()
      setSelectedMission(mission)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : resolveMissionCreateToastMessage(err))
    } finally {
      setSubmitting(false)
    }
  }, [captureValue, capturePriority, campaignId, captureFiles, onTeamChange])

  useEffect(() => {
    let mounted = true
    billingApi
      .getStatus()
      .then((status) => {
        if (!mounted) return
        setCreditsExhausted((status?.balance?.totalAvailable ?? 0) <= 0)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const runPreflight = async () => {
      const team = await fetchCampaignTeam(campaignId).catch(() => [])
      if (cancelled) return
      if (team.length === 0) {
        setCapabilityWarning(
          'No workers are assigned to this campaign. ROAS can send anyway, but results may be weak.',
        )
        return
      }
      const missionText = captureValue.toLowerCase()
      if (!missionText.trim()) {
        setCapabilityWarning(null)
        return
      }
      const teamAgentKeys = new Set(team.map((a) => a.agent_key))
      const teamAgents = dashboardAgents.filter((a) => teamAgentKeys.has(a.agent_key))
      const skillText = teamAgents
        .flatMap((a) => a.skills || [])
        .join(' ')
        .toLowerCase()
      const missionTokens = missionText
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 5)
      const matched = missionTokens.some((t) => skillText.includes(t))
      if (!matched) {
        setCapabilityWarning(
          'Team skills may not match this mission. ROAS will still proceed, but consider hiring a specialist.',
        )
      } else {
        setCapabilityWarning(null)
      }
    }
    void runPreflight()
    return () => {
      cancelled = true
    }
  }, [campaignId, captureValue, dashboardAgents])

  const inboxCount = campaignMissions.filter((mission) => mission.status === 'inbox').length
  const planningCount = campaignMissions.filter((mission) => mission.status === 'planning').length
  const todoCount = campaignMissions.filter((mission) => mission.status === 'todo').length
  const inProgressCount = campaignMissions.filter(
    (mission) => mission.status === 'in_progress',
  ).length
  const reviewCount = campaignMissions.filter((mission) => mission.status === 'review').length

  const statusRows = [
    { label: 'Inbox', count: inboxCount, bar: 'bar-glass-muted' },
    { label: 'Planning', count: planningCount, bar: 'bar-glass-orange' },
    { label: 'Todo', count: todoCount, bar: 'bar-glass-muted-light' },
    { label: 'In Progress', count: inProgressCount, bar: 'bar-glass-blue' },
    { label: 'Review', count: reviewCount, bar: 'bar-glass-purple' },
    { label: 'Blocked', count: blockedCount, bar: 'bar-glass-red' },
    { label: 'Done', count: doneCount, bar: 'bar-glass-green' },
  ]

  const completedMissions = campaignMissions.filter(
    (mission) => mission.status === 'done' && mission.completed_at,
  )
  const completionsByDay: Record<string, number> = {}
  for (const mission of completedMissions) {
    const day = new Date(mission.completed_at!).toISOString().slice(0, 10)
    completionsByDay[day] = (completionsByDay[day] || 0) + 1
  }
  const today = new Date()
  const chartData = Array.from({ length: completionDays }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (completionDays - 1 - index))
    const key = date.toISOString().slice(0, 10)
    return {
      date: key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      completed: completionsByDay[key] || 0,
    }
  })
  const completionsChartConfig = {
    completed: { label: 'Completed', color: 'rgba(52, 211, 153, 0.7)' },
  } satisfies ChartConfig

  return (
    <div className="space-y-6 md:pr-6">
      {/* Project manager banner — disabled per product request
      {!hasProjectManager && !projectManagerBannerDismissed && (
        <div className="banner-glass-purple p-spacing-4 relative">
          <button
            type="button"
            className="absolute right-2 top-2 z-20 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            onClick={() => setProjectManagerBannerDismissed(true)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="gap-spacing-3 sm:gap-spacing-6 relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-spacing-1 sm:space-y-spacing-2">
              <span className="body-2 text-foreground block">
                This campaign has no project manager
              </span>
              <span className="body-3 text-muted-foreground block">
                Hire one to manage tasks and team coordination.
              </span>
            </div>
            <div className="flex flex-shrink-0 items-center">
              <Link
                href="/team?hire=true&hireFilter=manager"
                className="button-glass-accent relative inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-all duration-300 sm:flex-initial sm:px-4"
              >
                <span className="relative z-10">Hire Project Manager</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      */}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-glass p-5">
          <h3 className="body-2 text-foreground mb-4 font-semibold">Mission Status</h3>
          <div className="space-y-2.5">
            {statusRows.map((row) => {
              const pct =
                campaignMissions.length > 0 ? (row.count / campaignMissions.length) * 100 : 0
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="body-4 text-muted-foreground w-20">{row.label}</span>
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${row.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="body-4 text-foreground w-6 text-right font-medium">
                    {row.count}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
            <span className="body-4 text-muted-foreground">Total</span>
            <span className="body-2 text-foreground font-bold">{campaignMissions.length}</span>
          </div>
        </div>

        <div className="card-glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="body-2 text-foreground font-semibold">Completions</h3>
            <div className="gap-spacing-2 flex items-center">
              <div className="relative" data-dropdown>
                <span
                  className="tooltip"
                  data-tooltip={COMPLETION_DAYS_LABELS[completionDays] ?? `Last ${completionDays}d`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframeDropdownOpen(!timeframeDropdownOpen)
                      setChartDropdownOpen(false)
                    }}
                    className="chip-glass-neutral body-4 text-muted-foreground h-spacing-8 flex items-center gap-1 rounded-lg px-3"
                  >
                    {COMPLETION_DAYS_LABELS[completionDays] ?? `Last ${completionDays}d`}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </span>
                {timeframeDropdownOpen && (
                  <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-2 min-w-36">
                      <div className="space-y-spacing-1">
                        {[
                          { value: 1, label: 'Last 24h' },
                          { value: 3, label: 'Last 3 days' },
                          { value: 7, label: 'Last 7 days' },
                          { value: 14, label: 'Last 14 days' },
                          { value: 30, label: 'Last 30 days' },
                          { value: 60, label: 'Last 60 days' },
                          { value: 90, label: 'Last 90 days' },
                        ].map((opt) => {
                          const isSelected = completionDays === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setCompletionDays(opt.value)
                                setTimeframeDropdownOpen(false)
                              }}
                              className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="icon-sm ml-auto" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" data-dropdown>
                <span
                  className="tooltip"
                  data-tooltip={
                    completionChartType.charAt(0).toUpperCase() + completionChartType.slice(1)
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setChartDropdownOpen(!chartDropdownOpen)
                      setTimeframeDropdownOpen(false)
                    }}
                    className="btn-icon-glass"
                  >
                    {completionChartType === 'bar' && <BarChart3 className="icon-sm" />}
                    {completionChartType === 'area' && <AreaChartIcon className="icon-sm" />}
                    {completionChartType === 'line' && <LineChartIcon className="icon-sm" />}
                    {completionChartType === 'pie' && <PieChartIcon className="icon-sm" />}
                  </button>
                </span>
                {chartDropdownOpen && (
                  <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-2 min-w-36">
                      <div className="space-y-spacing-1">
                        {[
                          { value: 'bar' as const, label: 'Bar', Icon: BarChart3 },
                          { value: 'area' as const, label: 'Area', Icon: AreaChartIcon },
                          { value: 'line' as const, label: 'Line', Icon: LineChartIcon },
                          { value: 'pie' as const, label: 'Pie', Icon: PieChartIcon },
                        ].map((opt) => {
                          const isSelected = completionChartType === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setCompletionChartType(opt.value)
                                setChartDropdownOpen(false)
                              }}
                              className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                            >
                              <opt.Icon className="icon-sm" />
                              <span>{opt.label}</span>
                              {isSelected && <Check className="icon-sm ml-auto" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {completedMissions.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="body-4 text-muted-foreground">No completed missions yet</p>
            </div>
          ) : (
            <ChartContainer
              config={completionsChartConfig}
              className="aspect-auto h-[180px] w-full"
            >
              {completionChartType === 'bar' && (
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              {completionChartType === 'area' && (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="completed"
                    type="natural"
                    fill="url(#fillCompleted)"
                    stroke="var(--color-completed)"
                  />
                </AreaChart>
              )}
              {completionChartType === 'line' && (
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="completed"
                    type="monotone"
                    stroke="var(--color-completed)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
              {completionChartType === 'pie' && (
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartData
                      .filter((data) => data.completed > 0)
                      .map((data) => ({
                        name: data.label,
                        value: data.completed,
                        fill: 'var(--color-completed)',
                      }))}
                    dataKey="value"
                    nameKey="name"
                  />
                </PieChart>
              )}
            </ChartContainer>
          )}
        </div>
      </div>

      <section className="mt-spacing-4">
        <div className="mb-spacing-6">
          <MissionQuickCapture
            value={captureValue}
            priority={capturePriority}
            campaigns={campaignListItem}
            selectedCampaignId={campaignId}
            files={captureFiles}
            hideCampaignSelector
            onChange={setCaptureValue}
            onPriorityChange={setCapturePriority}
            onCampaignChange={() => {}}
            onFilesChange={handleCaptureFilesChange}
            onSubmit={() => void handleCreateMission()}
            disabled={submitting}
            capabilityWarning={capabilityWarning}
            onHireClick={() => router.push('/team?hire=true')}
            creditsExhausted={creditsExhausted}
            onGetCredits={() => openAccountSettings('billing')}
          />
        </div>
        <div className="mb-spacing-3">
          <MissionControlToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilters={priorityFilters}
            onPriorityFiltersChange={setPriorityFilters}
            currentSort={currentSort}
            onSortChange={setCurrentSort}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        <div>
          {filteredCampaignMissions.length === 0 ? (
            <div className="card-glass p-8 text-center">
              <p className="body-3 text-muted-foreground">No missions match your filters.</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <MissionKanbanBoard
              missions={filteredCampaignMissions}
              onMissionClick={(m) => setSelectedMission(m)}
            />
          ) : (
            <MissionList
              missions={filteredCampaignMissions}
              agents={dashboardAgents}
              campaigns={campaignListItem}
              selectedMissionId={selectedMission?.id ?? null}
              onSelect={(missionId) => {
                const m = campaignMissions.find((ms) => ms.id === missionId)
                setSelectedMission(m ?? null)
              }}
              onChanged={onTeamChange}
            />
          )}
        </div>
      </section>

      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onUpdated={onTeamChange}
        />
      )}
    </div>
  )
}
