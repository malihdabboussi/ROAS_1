'use client'

import { backendGet } from '@/lib/api/backend-client'

const BASE = '/api/agent-teams'

export interface TeamOverviewAgent {
  id: string
  agent_key: string
  name: string
  role: string
  status: 'online' | 'idle' | 'working' | 'offline'
  image_url: string | null
  updated_at: string | null
}

export interface TeamOverviewKpis {
  agents_by_status: Partial<Record<TeamOverviewAgent['status'], number>>
  missions: {
    active: number
    blocked: number
    todo: number
    completed: number
    failed: number
    /** Legacy field; equals window.completed when default 7d range is used. */
    done_7d?: number
  }
  window: {
    completed: number
    failed: number
    avg_duration_minutes: number
    prev_completed: number
    prev_failed: number
  }
}

export interface TeamOverviewSeriesPoint {
  day: string
  n: number
}

export interface TeamOverviewSeries {
  missions_completed_daily: TeamOverviewSeriesPoint[]
  missions_failed_daily: TeamOverviewSeriesPoint[]
  chats_daily: TeamOverviewSeriesPoint[]
  channel_posts_daily: TeamOverviewSeriesPoint[]
  automations_daily: TeamOverviewSeriesPoint[]
}

export interface TeamOverviewAgentWindow {
  agent_key: string
  completed: number
  failed: number
  live_active: number
  live_blocked: number
}

export interface TeamOverviewCoverageCampaign {
  id: string
  name: string
  completed: number
}

export interface TeamOverviewCoverageChannel {
  id: string
  name: string
  posts: number
}

export interface TeamOverviewCoverage {
  by_campaign: TeamOverviewCoverageCampaign[]
  by_channel: TeamOverviewCoverageChannel[]
}

export interface TeamOverviewWindow {
  start: string
  end: string
  prev_start: string
  prev_end: string
}

export interface TeamOverviewLiveMission {
  kind: 'mission'
  id: string
  title: string
  status: string
  current_agent_key: string | null
  assigned_agent_key: string | null
  happened_at: string
}

export interface TeamOverviewLiveTask {
  kind: 'task'
  id: string
  space_id: string
  space_title: string | null
  title: string
  status: 'running'
  agent_key: string | null
  happened_at: string
}

export interface TeamOverviewLiveTrace {
  kind: 'trace'
  id: string
  conversation_id: string
  conversation_title: string | null
  agent_key: string | null
  channel: string | null
  happened_at: string
}

export interface TeamOverviewLiveDelegation {
  kind: 'delegation'
  id: string
  conversation_id: string | null
  caller_agent_key: string
  target_agent_key: string
  status: 'pending' | 'running'
  type: string
  prompt_preview: string | null
  happened_at: string
}

export interface TeamOverviewRecentMission {
  kind: 'mission'
  id: string
  title: string
  status: string
  current_agent_key: string | null
  assigned_agent_key: string | null
  happened_at: string
}

export interface TeamOverviewRecentChannel {
  kind: 'channel'
  id: string
  channel_id: string
  channel_name: string | null
  agent_key: string | null
  preview: string | null
  happened_at: string
}

export interface TeamOverviewRecentAutomation {
  kind: 'automation'
  id: string
  space_id: string
  space_title: string | null
  automation_id: string
  status: 'success' | 'partial' | 'failed'
  linked_mission_id: string | null
  happened_at: string
}

export interface TeamOverviewRecentChat {
  kind: 'chat'
  id: string
  conversation_title: string | null
  agent_key: string | null
  reply_count: number
  happened_at: string
}

export type TeamOverviewLiveItem =
  | TeamOverviewLiveMission
  | TeamOverviewLiveTask
  | TeamOverviewLiveTrace
  | TeamOverviewLiveDelegation

export type TeamOverviewRecentItem =
  | TeamOverviewRecentMission
  | TeamOverviewRecentChat
  | TeamOverviewRecentChannel
  | TeamOverviewRecentAutomation

export interface TeamOverviewPayload {
  team_id: string
  generated_at: string
  window: TeamOverviewWindow
  agents: TeamOverviewAgent[]
  kpis: TeamOverviewKpis
  series: TeamOverviewSeries
  per_agent: TeamOverviewAgentWindow[]
  coverage: TeamOverviewCoverage
  live: {
    missions: TeamOverviewLiveMission[]
    tasks: TeamOverviewLiveTask[]
    traces: TeamOverviewLiveTrace[]
    delegations: TeamOverviewLiveDelegation[]
  }
  recent: {
    missions: TeamOverviewRecentMission[]
    chats: TeamOverviewRecentChat[]
    channel: TeamOverviewRecentChannel[]
    automations: TeamOverviewRecentAutomation[]
  }
}

export function emptyTeamOverviewPayload(teamId: string): TeamOverviewPayload {
  const nowIso = new Date(0).toISOString()
  return {
    team_id: teamId,
    generated_at: nowIso,
    window: { start: nowIso, end: nowIso, prev_start: nowIso, prev_end: nowIso },
    agents: [],
    kpis: {
      agents_by_status: {},
      missions: {
        active: 0,
        blocked: 0,
        todo: 0,
        completed: 0,
        failed: 0,
      },
      window: {
        completed: 0,
        failed: 0,
        avg_duration_minutes: 0,
        prev_completed: 0,
        prev_failed: 0,
      },
    },
    series: {
      missions_completed_daily: [],
      missions_failed_daily: [],
      chats_daily: [],
      channel_posts_daily: [],
      automations_daily: [],
    },
    per_agent: [],
    coverage: { by_campaign: [], by_channel: [] },
    live: {
      missions: [],
      tasks: [],
      traces: [],
      delegations: [],
    },
    recent: {
      missions: [],
      chats: [],
      channel: [],
      automations: [],
    },
  }
}

export interface TeamOverviewRangeParams {
  start?: string
  end?: string
}

export async function fetchTeamOverview(
  teamId: string,
  range?: TeamOverviewRangeParams,
): Promise<TeamOverviewPayload> {
  const params = new URLSearchParams()
  if (range?.start) params.set('start', range.start)
  if (range?.end) params.set('end', range.end)
  const qs = params.toString()
  const path = qs ? `${BASE}/${teamId}/overview?${qs}` : `${BASE}/${teamId}/overview`
  return backendGet<TeamOverviewPayload>(path)
}
