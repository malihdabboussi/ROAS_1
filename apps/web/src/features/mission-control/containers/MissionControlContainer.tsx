'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { billingApi } from '@/lib/billing/billing-api'
import { fetchCampaignTeam } from '@/lib/campaigns/campaign-api'
import { CHAT_MAX_FILES, CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { useAccountSettingsModal } from '@/lib/settings/account-settings-modal-context'
import { MissionKanbanBoard } from '../components/board/MissionKanbanBoard'
import { MissionDetailModal } from '../components/dialogs/MissionDetailModal'
import {
  MissionControlToolbar,
  type MissionPriorityFilter,
  type MissionSort,
  type MissionStatusFilter,
  type MissionViewMode,
} from '../components/MissionControlToolbar'
import { MissionList } from '../components/MissionList'
import { MissionQuickCapture } from '../components/MissionQuickCapture'
import { MISSION_CONTROL_MESSAGES } from '../config/messages.config'
import { resolveMissionCreateToastMessage } from '../config/mission-control-toast-errors.config'
import { uploadMissionCreationAttachments } from '../lib/upload-mission-creation-attachments'
import { createMission } from '../services/missions.service'
import { useMissionDashboardStore } from '../store/use-mission-dashboard-store'
import type { Mission, MissionPriority } from '../types'

export function MissionControlContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openAccountSettings } = useAccountSettingsModal()
  const missions = useMissionDashboardStore((s) => s.missions)
  const rawCampaigns = useMissionDashboardStore((s) => s.campaigns)
  const agents = useMissionDashboardStore((s) => s.agents)
  const loading = useMissionDashboardStore((s) => s.loading)
  const loadError = useMissionDashboardStore((s) => s.loadError)
  const refresh = useMissionDashboardStore((s) => s.refresh)
  const startPolling = useMissionDashboardStore((s) => s.startPolling)
  const stopPolling = useMissionDashboardStore((s) => s.stopPolling)
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const campaigns = useMemo(
    () =>
      rawCampaigns
        .filter((c) => (c.config as Record<string, unknown>)?.system_kind !== 'general')
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: ((c.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban',
        })),
    [rawCampaigns],
  )
  const [statusFilter, setStatusFilter] = useState<MissionStatusFilter>('all')
  const [priorityFilters, setPriorityFilters] = useState<MissionPriorityFilter[]>([])
  const [currentSort, setCurrentSort] = useState<MissionSort>('updated_at.desc')
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<MissionViewMode>('list')
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const [captureValue, setCaptureValue] = useState('')
  const [capturePriority, setCapturePriority] = useState<MissionPriority | null>(null)
  const [captureCampaignId, setCaptureCampaignId] = useState<string | null>(null)
  const [captureFiles, setCaptureFiles] = useState<File[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(null)

  useEffect(() => {
    startPolling()
    return () => {
      stopPolling()
    }
  }, [startPolling, stopPolling])

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
    const firstMission = missions[0]
    if (!selectedMissionId && firstMission) {
      setSelectedMissionId(firstMission.id)
    }
  }, [missions, selectedMissionId])

  const deepLinkedRef = useRef<string | null>(null)
  useEffect(() => {
    const paramId = searchParams?.get('mission')
    if (!paramId) return
    if (deepLinkedRef.current === paramId) return
    const target = missions.find((m) => m.id === paramId)
    if (!target) return
    deepLinkedRef.current = paramId
    setSelectedMissionId(paramId)
    setSelectedMission(target)
  }, [missions, searchParams])

  const filteredMissions = useMemo(() => {
    let list = [...missions]

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

    if (priorityFilters.length > 0) {
      list = list.filter((m) => priorityFilters.includes(m.priority))
    }

    const PRIORITY_RANK: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 }
    const [field, dir] = currentSort.split('.') as [string, string]
    list.sort((a, b) => {
      let cmp = 0
      if (field === 'priority')
        cmp = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
      else if (field === 'title') cmp = a.title.localeCompare(b.title)
      else if (field === 'created_at')
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      return dir === 'desc' ? -cmp : cmp
    })

    return list
  }, [missions, statusFilter, priorityFilters, searchValue, currentSort])

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
    if (!title || !captureCampaignId) return
    setSubmitting(true)
    try {
      let attachments: { url: string; name: string; size: number; type: string }[] = []

      if (captureFiles.length > 0) {
        attachments = await uploadMissionCreationAttachments(captureFiles, captureCampaignId)
      }

      const mission = await createMission({
        title,
        brief: title,
        priority: capturePriority || undefined,
        campaign_id: captureCampaignId || undefined,
        idempotency_key: `mission-${crypto.randomUUID()}`,
        input: attachments.length > 0 ? { attachments } : undefined,
      })
      setCaptureValue('')
      setCaptureFiles([])
      await refresh()
      setSelectedMissionId(mission.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : resolveMissionCreateToastMessage(err))
    } finally {
      setSubmitting(false)
    }
  }, [captureValue, capturePriority, captureCampaignId, captureFiles, refresh])

  useEffect(() => {
    let cancelled = false
    const runPreflight = async () => {
      if (!captureCampaignId) {
        setCapabilityWarning(null)
        return
      }
      const team = await fetchCampaignTeam(captureCampaignId).catch(() => [])
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
      const teamAgents = agents.filter((a) => teamAgentKeys.has(a.agent_key))
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
  }, [captureCampaignId, captureValue, agents])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading mission control..." state="processing" size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-7xl shrink-0 px-4 py-4 md:px-6">
        <header className="mb-spacing-4">
          <h1 className="text-foreground text-lg font-bold uppercase">
            {MISSION_CONTROL_MESSAGES.TITLE}
          </h1>
          <p className="body-3 text-muted-foreground mt-1">{MISSION_CONTROL_MESSAGES.SUBTITLE}</p>
        </header>

        <MissionQuickCapture
          value={captureValue}
          priority={capturePriority}
          campaigns={campaigns}
          selectedCampaignId={captureCampaignId}
          files={captureFiles}
          onChange={setCaptureValue}
          onPriorityChange={setCapturePriority}
          onCampaignChange={setCaptureCampaignId}
          onFilesChange={handleCaptureFilesChange}
          onSubmit={() => void handleCreateMission()}
          disabled={submitting}
          capabilityWarning={capabilityWarning}
          onHireClick={() => router.push('/team?hire=true')}
          creditsExhausted={creditsExhausted}
          onGetCredits={() => openAccountSettings('billing')}
        />

        {loadError ? (
          <div className="body-3 rounded-md bg-red-500/10 px-3 py-2 text-red-300">{loadError}</div>
        ) : null}
      </div>

      <section className="mt-spacing-6 relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-4 md:px-6">
        <div className="mb-spacing-3 shrink-0">
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
        <div className="pointer-events-none absolute left-0 right-0 top-[72px] z-10 h-6 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {filteredMissions.length === 0 ? (
            <div className="surface-card border-subtle rounded-xl p-4">
              <p className="body-2 text-foreground">
                {MISSION_CONTROL_MESSAGES.EMPTY_MISSIONS_TITLE}
              </p>
              <p className="body-4 text-muted-foreground mt-1">
                {MISSION_CONTROL_MESSAGES.EMPTY_MISSIONS_DESCRIPTION}
              </p>
            </div>
          ) : viewMode === 'kanban' ? (
            <MissionKanbanBoard
              missions={filteredMissions}
              onMissionClick={(m) => {
                setSelectedMissionId(m.id)
                setSelectedMission(m)
              }}
            />
          ) : (
            <MissionList
              missions={filteredMissions}
              agents={agents}
              campaigns={campaigns}
              selectedMissionId={selectedMissionId}
              onSelect={(missionId) => {
                setSelectedMissionId(missionId)
                const m = missions.find((ms) => ms.id === missionId)
                setSelectedMission(m ?? null)
              }}
              onChanged={() => void refresh()}
            />
          )}
        </div>
      </section>

      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onUpdated={() => void refresh()}
        />
      )}
    </div>
  )
}
