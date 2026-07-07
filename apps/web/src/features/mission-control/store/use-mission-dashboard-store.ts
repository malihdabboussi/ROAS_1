'use client'

import { create } from 'zustand'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { useOrgStore } from '@/lib/org/org-context-store'
import { createClient } from '@/lib/supabase/client'
import { fetchMissionAgents, fetchMissions } from '../services/missions.service'
import type { Mission, MissionAgent } from '../types'

const REALTIME_DEBOUNCE_MS = 450

let activeSubscribers = 0
let inFlightRefresh: Promise<void> | null = null
let hasBootstrapped = false

let realtimeSupabase: ReturnType<typeof createClient> | null = null
const realtimeChannels: Array<ReturnType<ReturnType<typeof createClient>['channel']>> = []
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null

function clearMissionDashboardRealtime() {
  if (realtimeDebounceTimer) {
    clearTimeout(realtimeDebounceTimer)
    realtimeDebounceTimer = null
  }
  if (realtimeSupabase && realtimeChannels.length > 0) {
    for (const ch of realtimeChannels) {
      void realtimeSupabase.removeChannel(ch)
    }
    realtimeChannels.length = 0
  }
  realtimeSupabase = null
}

function scheduleMissionDashboardRefresh(
  set: (partial: Partial<MissionDashboardState>) => void,
  get: () => MissionDashboardState,
) {
  if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer)
  realtimeDebounceTimer = setTimeout(() => {
    realtimeDebounceTimer = null
    void runRefresh(set, get)
  }, REALTIME_DEBOUNCE_MS)
}

function attachMissionDashboardRealtime(
  set: (partial: Partial<MissionDashboardState>) => void,
  get: () => MissionDashboardState,
) {
  clearMissionDashboardRealtime()
  realtimeSupabase = createClient()
  const sessionClient = realtimeSupabase

  void (async () => {
    const {
      data: { user },
    } = await sessionClient.auth.getUser()
    if (!user || realtimeSupabase !== sessionClient) return

    const uid = user.id
    const supabase = sessionClient
    const activeOrgId = useOrgStore.getState().activeOrgId

    if (activeOrgId) {
      const orgMissionCh = supabase
        .channel(`mission-dashboard-org-missions-${activeOrgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'missions',
            filter: `org_id=eq.${activeOrgId}`,
          },
          () => scheduleMissionDashboardRefresh(set, get),
        )
        .subscribe()
      realtimeChannels.push(orgMissionCh)

      const orgAgentsCh = supabase
        .channel(`mission-dashboard-org-agents-${activeOrgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agents_registry',
            filter: `org_id=eq.${activeOrgId}`,
          },
          () => scheduleMissionDashboardRefresh(set, get),
        )
        .subscribe()
      realtimeChannels.push(orgAgentsCh)
    } else {
      const missionCh = supabase
        .channel(`mission-dashboard-missions-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'missions',
            filter: `user_id=eq.${uid}`,
          },
          () => scheduleMissionDashboardRefresh(set, get),
        )
        .subscribe()
      realtimeChannels.push(missionCh)

      const agentsCh = supabase
        .channel(`mission-dashboard-agents-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agents_registry',
            filter: `user_id=eq.${uid}`,
          },
          () => scheduleMissionDashboardRefresh(set, get),
        )
        .subscribe()
      realtimeChannels.push(agentsCh)

      const campaigns = await fetchCampaigns().catch(() => [])
      const campaignIds = campaigns
        .filter((campaign) => String(campaign.user_id) !== uid)
        .map((campaign) => String(campaign.id))
      for (const cid of campaignIds) {
        const sharedMissionCh = supabase
          .channel(`mission-dashboard-shared-${cid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'missions', filter: `campaign_id=eq.${cid}` },
            () => scheduleMissionDashboardRefresh(set, get),
          )
          .subscribe()
        realtimeChannels.push(sharedMissionCh)
      }
    }
  })()
}

interface MissionDashboardState {
  missions: Mission[]
  campaigns: Campaign[]
  agents: MissionAgent[]
  loading: boolean
  loadError: string | null
  refresh: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
}

async function runRefresh(
  set: (partial: Partial<MissionDashboardState>) => void,
  get: () => MissionDashboardState,
): Promise<void> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    const shouldShowInitialLoading = !hasBootstrapped && get().missions.length === 0
    if (shouldShowInitialLoading) {
      set({ loading: true })
    }
    try {
      const [missions, campaigns, agents] = await Promise.all([
        fetchMissions(),
        fetchCampaigns(),
        fetchMissionAgents(),
      ])
      set({
        missions,
        campaigns,
        agents,
        loadError: null,
      })
    } catch {
      set({
        loadError: 'Failed to load mission control data.',
      })
    } finally {
      if (shouldShowInitialLoading) {
        set({ loading: false })
      }
      hasBootstrapped = true
      inFlightRefresh = null
    }
  })()

  return inFlightRefresh
}

export const useMissionDashboardStore = create<MissionDashboardState>((set, get) => ({
  missions: [],
  campaigns: [],
  agents: [],
  loading: true,
  loadError: null,
  refresh: async () => runRefresh(set, get),
  startPolling: () => {
    activeSubscribers += 1

    if (activeSubscribers === 1) {
      void runRefresh(set, get)
      attachMissionDashboardRealtime(set, get)
    }
  },
  stopPolling: () => {
    activeSubscribers = Math.max(0, activeSubscribers - 1)
    if (activeSubscribers === 0) {
      clearMissionDashboardRealtime()
    }
  },
}))
