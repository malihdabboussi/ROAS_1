'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchMissionById, type Mission } from '@/lib/missions'
import { useOrgStore } from '@/lib/org'
import { resolveReportingDates, type ReportingDateRangeInput } from '@/lib/reporting'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { useTeamOverview } from '../../hooks/use-team-overview'
import {
  type TeamOverviewAgent,
  type TeamOverviewLiveItem,
  type TeamOverviewRecentChat,
  type TeamOverviewRecentItem,
} from '../../services/team-overview.service'
import { DailyActivityCard, MissionHealthCard } from './TeamOverviewActivityCards'
import { TeamOverviewChatModal } from './TeamOverviewChatModal'
import { TeamOverviewFeedSections } from './TeamOverviewFeedSections'
import { ActiveNowCard, TeamStatusCard, ThroughputCard } from './TeamOverviewStatusCards'
import {
  CoverageByCampaignCard,
  CoverageByChannelCard,
  WorkloadByAgentCard,
} from './TeamOverviewWorkloadCards'
import {
  filterOverviewLiveItems,
  filterOverviewRecentItems,
  liveItemTime,
  RECENT_ACTIVITY_INITIAL,
  RECENT_ACTIVITY_PAGE,
  recentItemTime,
  startOfTodayIso,
  toIsoEnd,
  toIsoStart,
} from './team-overview-utils'

interface TeamOverviewViewProps {
  teamId: string
  rangeConfig: ReportingDateRangeInput
  campaignFilterIds: string[]
  spaceFilterIds: string[]
  missionCampaignById: Map<string, string | null>
}

export function TeamOverviewView({
  teamId,
  rangeConfig,
  campaignFilterIds,
  spaceFilterIds,
  missionCampaignById,
}: TeamOverviewViewProps) {
  const { startDate, endDate } = useMemo(
    () => resolveReportingDates(rangeConfig),
    [rangeConfig.time_range, rangeConfig.custom_start, rangeConfig.custom_end],
  )

  const rangeParams = useMemo(
    () => ({
      start: toIsoStart(startDate),
      end: toIsoEnd(endDate) ?? startOfTodayIso(),
    }),
    [startDate, endDate],
  )

  const { data, loading, error } = useTeamOverview(teamId, rangeParams)
  const orgId = useOrgStore((s) => s.activeOrgId)
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [selectedChat, setSelectedChat] = useState<TeamOverviewRecentChat | null>(null)
  const [recentVisibleCount, setRecentVisibleCount] = useState(RECENT_ACTIVITY_INITIAL)
  const hasInitialData = data.window.start !== new Date(0).toISOString()

  const openMissionById = useCallback(
    async (missionId: string) => {
      try {
        const mission = await fetchMissionById(missionId, { orgId })
        setSelectedMission(mission)
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Could not open mission'))
      }
    },
    [orgId],
  )

  const handleRecentItemClick = useCallback(
    (item: TeamOverviewRecentItem) => {
      if (item.kind === 'mission') {
        void openMissionById(item.id)
        return
      }
      if (item.kind === 'chat') {
        setSelectedChat(item)
      }
    },
    [openMissionById],
  )

  const agentByKey = useMemo(() => {
    const map = new Map<string, TeamOverviewAgent>()
    for (const agent of data.agents) map.set(agent.agent_key, agent)
    return map
  }, [data.agents])

  const sortedLiveItems = useMemo<TeamOverviewLiveItem[]>(
    () =>
      [
        ...data.live.missions,
        ...data.live.tasks,
        ...data.live.traces,
        ...data.live.delegations,
      ].sort((a, b) => liveItemTime(b).localeCompare(liveItemTime(a))),
    [data.live],
  )

  const sortedRecentItems = useMemo<TeamOverviewRecentItem[]>(
    () =>
      [
        ...data.recent.missions,
        ...data.recent.chats,
        ...data.recent.channel,
        ...data.recent.automations,
      ].sort((a, b) => recentItemTime(b).localeCompare(recentItemTime(a))),
    [data.recent],
  )

  const liveItems = useMemo(
    () =>
      filterOverviewLiveItems(
        sortedLiveItems,
        campaignFilterIds,
        spaceFilterIds,
        missionCampaignById,
      ),
    [sortedLiveItems, campaignFilterIds, spaceFilterIds, missionCampaignById],
  )

  const recentItems = useMemo(
    () =>
      filterOverviewRecentItems(
        sortedRecentItems,
        campaignFilterIds,
        spaceFilterIds,
        missionCampaignById,
      ),
    [sortedRecentItems, campaignFilterIds, spaceFilterIds, missionCampaignById],
  )

  useEffect(() => {
    setRecentVisibleCount(RECENT_ACTIVITY_INITIAL)
  }, [recentItems])

  const visibleRecentItems = useMemo(
    () => recentItems.slice(0, recentVisibleCount),
    [recentItems, recentVisibleCount],
  )

  const hasMoreRecent = recentItems.length > recentVisibleCount

  if (loading && !hasInitialData) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center">
        <VibeyLoadingOrb
          text="Pulling this team's pulse together..."
          state="processing"
          size="lg"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center">
        <p className="body-3 text-muted-foreground">{error}</p>
      </div>
    )
  }

  const totalLive = liveItems.length
  const liveSplit = {
    missions: liveItems.filter((i) => i.kind === 'mission').length,
    tasks: liveItems.filter((i) => i.kind === 'task').length,
    chats: liveItems.filter((i) => i.kind === 'trace').length,
    delegations: liveItems.filter((i) => i.kind === 'delegation').length,
  }
  const blockedLive = liveItems.filter((i) => i.kind === 'mission' && i.status === 'blocked').length
  const window = data.kpis.window

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="gap-spacing-3 grid grid-cols-1 lg:grid-cols-3">
        <ActiveNowCard total={totalLive} split={liveSplit} blocked={blockedLive} />
        <TeamStatusCard agents={data.agents} />
        <ThroughputCard
          completed={window.completed}
          failed={window.failed}
          prevCompleted={window.prev_completed}
          avgDurationMinutes={window.avg_duration_minutes}
          series={data.series.missions_completed_daily}
        />
      </div>

      <div className="gap-spacing-3 grid grid-cols-1 lg:grid-cols-2">
        <MissionHealthCard kpis={data.kpis.missions} />
        <DailyActivityCard
          missions={data.series.missions_completed_daily}
          chats={data.series.chats_daily ?? []}
          channel={data.series.channel_posts_daily}
          automations={data.series.automations_daily}
        />
      </div>

      <WorkloadByAgentCard agents={data.agents} perAgent={data.per_agent} />

      {(data.coverage.by_campaign.length > 0 || data.coverage.by_channel.length > 0) && (
        <div className="gap-spacing-3 grid grid-cols-1 lg:grid-cols-2">
          <CoverageByCampaignCard rows={data.coverage.by_campaign} />
          <CoverageByChannelCard rows={data.coverage.by_channel} />
        </div>
      )}

      <TeamOverviewFeedSections
        liveItems={liveItems}
        recentItems={recentItems}
        visibleRecentItems={visibleRecentItems}
        hasMoreRecent={hasMoreRecent}
        onLoadMoreRecent={() => setRecentVisibleCount((n) => n + RECENT_ACTIVITY_PAGE)}
        onRecentItemClick={handleRecentItemClick}
        agentByKey={agentByKey}
      />

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onUpdated={() => setSelectedMission(null)}
        />
      ) : null}

      {selectedChat ? (
        <TeamOverviewChatModal
          open
          onClose={() => setSelectedChat(null)}
          conversationId={selectedChat.id}
          conversationTitle={selectedChat.conversation_title ?? 'Conversation'}
          agent={selectedChat.agent_key ? (agentByKey.get(selectedChat.agent_key) ?? null) : null}
        />
      ) : null}
    </div>
  )
}
