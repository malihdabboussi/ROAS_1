'use client'

import { useMemo } from 'react'
import type { Mission } from '@/lib/missions'
import { STATUS_LABELS, SYSTEM_LIKE_AGENT_KEYS } from './agent-team-display'
import type { MissionAgent } from './mission-agents-api'

export function useTeamContainerDerived(
  selected: MissionAgent | null,
  agents: MissionAgent[],
  missions: Mission[],
) {
  const level = selected?.level || 'employee'
  const isSelectedEmployee = level === 'employee'
  const isSelectedManager = level === 'manager'
  const isSystemLikeAgent = SYSTEM_LIKE_AGENT_KEYS.has(selected?.agent_key ?? '')
  const isSelectedRemovable = (isSelectedEmployee || isSelectedManager) && !isSystemLikeAgent
  const bio = (selected?.config as Record<string, string> | undefined)?.style_description
  const statusLabel = STATUS_LABELS[selected?.status ?? 'offline'] ?? 'Offline'

  const stats = selected?.stats ?? {}
  const missionsScored = stats.missions_scored ?? 0
  const overall = stats.overall ?? 0
  const hasStats = missionsScored > 0

  const metrics: Array<{ key: string; label: string }> = [
    { key: 'quality', label: 'Quality' },
    { key: 'reliability', label: 'Reliable' },
    { key: 'intent_alignment', label: 'Intent' },
    { key: 'craft', label: 'Craft' },
    { key: 'originality', label: 'Original' },
    { key: 'brand_coherence', label: 'Brand' },
    { key: 'completeness', label: 'Complete' },
  ]

  const overallColor =
    overall >= 8
      ? 'text-status-emerald'
      : overall >= 6
        ? 'text-status-emerald'
        : overall >= 4
          ? 'text-status-amber'
          : 'text-status-red'

  const agentKey = selected?.agent_key ?? ''
  const agentMissions = useMemo(
    () =>
      missions.filter((m) => m.assigned_agent_key === agentKey || m.current_agent_key === agentKey),
    [agentKey, missions],
  )
  const todoCount = agentMissions.filter((m) => m.status === 'todo' || m.status === 'inbox').length
  const activeCount = agentMissions.filter((m) =>
    ['planning', 'in_progress', 'review'].includes(m.status),
  ).length
  const blockedCount = agentMissions.filter((m) => m.status === 'blocked').length

  const completedMissions = agentMissions.filter((m) => m.status === 'done')
  const failedMissions = agentMissions.filter((m) => m.status === 'failed' || m.status === 'error')
  const totalCompleted = completedMissions.length
  const totalFailed = failedMissions.length
  const successRate =
    totalCompleted + totalFailed > 0
      ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
      : null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const completedThisMonth = completedMissions.filter(
    (m) => m.completed_at && m.completed_at >= monthStart,
  ).length

  const avgCompletionRate = useMemo(() => {
    const withSubtasks = agentMissions.filter((m) => m.subtask_total != null && m.subtask_total > 0)
    if (withSubtasks.length === 0) return null
    const sum = withSubtasks.reduce((acc, m) => acc + (m.subtask_done ?? 0) / m.subtask_total!, 0)
    return Math.round((sum / withSubtasks.length) * 100)
  }, [agentMissions])

  const lastActiveRaw =
    (selected?.config as Record<string, string> | undefined)?.last_active ??
    stats.last_scored_at ??
    selected?.updated_at
  const lastActiveLabel = lastActiveRaw
    ? (() => {
        const diff = Date.now() - new Date(lastActiveRaw).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 2) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.floor(hrs / 24)}d ago`
      })()
    : null

  const statusBadgeText =
    selected?.status === 'working' || selected?.status === 'online' ? statusLabel : lastActiveLabel

  const nonSystemAgents = agents.filter((a) => a.level !== 'system')
  const cLevelCount = nonSystemAgents.filter((a) => a.level === 'c_level').length
  const managerCount = nonSystemAgents.filter((a) => a.level === 'manager').length
  const employeeCount = nonSystemAgents.filter((a) => !a.level || a.level === 'employee').length
  const activeMembersCount = nonSystemAgents.filter(
    (a) => a.status === 'online' || a.status === 'working',
  ).length
  const idleMembersCount = nonSystemAgents.filter((a) => a.status === 'idle').length

  return {
    level,
    isSelectedEmployee,
    isSelectedManager,
    isSystemLikeAgent,
    isSelectedRemovable,
    bio,
    statusLabel,
    stats,
    overall,
    hasStats,
    metrics,
    overallColor,
    todoCount,
    activeCount,
    blockedCount,
    totalCompleted,
    completedThisMonth,
    successRate,
    avgCompletionRate,
    missionsScored,
    lastActiveLabel,
    statusBadgeText,
    cLevelCount,
    managerCount,
    employeeCount,
    activeMembersCount,
    idleMembersCount,
  }
}
