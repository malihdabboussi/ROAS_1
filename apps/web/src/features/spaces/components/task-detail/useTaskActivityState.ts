'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCampaignTeam } from '@/lib/campaigns'
import type { ChannelMember, ChannelMention } from '@/lib/channels'
import { createClient } from '@/lib/supabase/client'
import type { TeamRosterEntry } from '@/lib/team'
import { mergeActivityEntry } from '../../lib/merge-activity-entry'
import { buildTaskComposerMembersFromRoster } from '../../lib/task-composer-members'
import {
  addItemComment,
  cancelTaskAgent,
  fetchItemActivity,
  updateSpaceItem,
  type ActivityMention,
  type SpaceItemActivity,
} from '../../services/spaces.service'
import { activityAttachmentsFromUrls } from './task-activity-attachments'
import { buildRosterAvatarsMap } from './task-activity-format'
import type { MissionLog, TaskActivityAuthProfile, TimelineEntry } from './task-activity-types'

interface UseTaskActivityStateArgs {
  spaceId: string
  itemId: string
  missionLogs: MissionLog[]
  campaignId: string | null
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onActivityEntryAdded?: (entry: SpaceItemActivity) => void
  onSendExternalComment?: (input: { content: string; authorName: string }) => Promise<void>
}

export function useTaskActivityState({
  spaceId,
  itemId,
  missionLogs,
  campaignId,
  roster,
  currentUserId,
  onActivityEntryAdded,
  onSendExternalComment,
}: UseTaskActivityStateArgs) {
  const [activity, setActivity] = useState<SpaceItemActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignAgentMembers, setCampaignAgentMembers] = useState<ChannelMember[]>([])
  const [stoppingAgentActivityId, setStoppingAgentActivityId] = useState<string | null>(null)
  const [authProfile, setAuthProfile] = useState<TaskActivityAuthProfile>({
    avatarUrl: null,
    displayName: '',
  })

  useEffect(() => {
    let cancelled = false
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled || !user) return
        const meta = user.user_metadata as Record<string, unknown> | undefined
        const urlRaw = meta?.avatar_url ?? meta?.picture
        const nameRaw = meta?.full_name ?? meta?.name ?? user.email?.split('@')[0] ?? ''
        setAuthProfile({
          avatarUrl: typeof urlRaw === 'string' && urlRaw.length > 0 ? urlRaw : null,
          displayName: typeof nameRaw === 'string' ? nameRaw : '',
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadActivity = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchItemActivity(spaceId, itemId)
      setActivity(data)
    } catch {
      setActivity([])
    } finally {
      setLoading(false)
    }
  }, [spaceId, itemId])

  useEffect(() => {
    void loadActivity()
  }, [loadActivity])

  useEffect(() => {
    if (!campaignId) {
      setCampaignAgentMembers([])
      return
    }
    fetchCampaignTeam(campaignId)
      .then((agents) => {
        const members: ChannelMember[] = agents.map((a, idx) => ({
          id: `campaign-agent-${idx}-${a.agent_key}`,
          channel_id: '',
          member_type: 'agent' as const,
          user_id: null,
          agent_key: a.agent_key,
          role: 'view' as const,
          added_by: null,
          joined_at: '',
          created_at: '',
          profile: {
            id: a.agent_key,
            full_name: a.name?.trim() || a.agent_key,
            avatar_url: null,
          },
        }))
        setCampaignAgentMembers(members)
      })
      .catch(() => setCampaignAgentMembers([]))
  }, [campaignId])

  const rosterAvatars = useMemo(() => {
    const map = buildRosterAvatarsMap(roster)
    if (currentUserId && authProfile.avatarUrl && !map.has(currentUserId)) {
      map.set(currentUserId, authProfile.avatarUrl)
    }
    return map
  }, [roster, currentUserId, authProfile.avatarUrl])

  const composerMembers = useMemo((): ChannelMember[] => {
    const rosterMembers = buildTaskComposerMembersFromRoster(roster, currentUserId, {
      selfDisplayName: authProfile.displayName,
      selfAvatarUrl: authProfile.avatarUrl,
    })
    const rosterAgentKeys = new Set(
      rosterMembers
        .filter((m) => m.member_type === 'agent' && m.agent_key)
        .map((m) => m.agent_key as string),
    )
    const extraFromCampaign = campaignAgentMembers.filter(
      (m) => m.agent_key && !rosterAgentKeys.has(m.agent_key),
    )
    return [...rosterMembers, ...extraFromCampaign]
  }, [roster, campaignAgentMembers, currentUserId, authProfile.displayName, authProfile.avatarUrl])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`task-activity-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_item_activity',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const eventType = payload.eventType
          const next = payload.new as SpaceItemActivity
          const previous = payload.old as { id?: string } | null

          setActivity((current) => {
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              return mergeActivityEntry(current, next)
            }
            if (eventType === 'DELETE') {
              const deleteId = previous?.id
              if (!deleteId) return current
              return current.filter((item) => item.id !== deleteId)
            }
            return current
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [itemId])

  const merged: TimelineEntry[] = useMemo(
    () =>
      [
        ...activity.map((a) => ({
          id: a.id,
          source: 'human' as const,
          user_id: a.user_id,
          event_type: a.event_type,
          payload: a.payload,
          created_at: a.created_at,
        })),
        ...missionLogs.map((l) => ({
          id: l.id,
          source: 'agent' as const,
          user_id: null,
          event_type: l.event_type,
          payload: l.payload,
          created_at: l.created_at,
          agent_key: l.agent_key,
        })),
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [activity, missionLogs],
  )

  const handleComposerSend = useCallback(
    (payload: {
      content: string
      mentions: ChannelMention[]
      attachments?: string[]
      skill_keys?: string[]
    }) => {
      const mentions: ActivityMention[] = payload.mentions.map((m) => ({
        type: m.type,
        user_id: m.user_id,
        agent_key: m.agent_key,
        entity_id: m.entity_id,
        label: m.label,
      }))
      const attachments = activityAttachmentsFromUrls(payload.attachments ?? [])
      if (onSendExternalComment) {
        void onSendExternalComment({
          content: payload.content,
          authorName: authProfile.displayName || 'ROAS user',
        })
          .then(loadActivity)
          .catch(() => {})
        return
      }
      addItemComment(spaceId, itemId, payload.content, {
        mentions: mentions.length > 0 ? mentions : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        skill_keys: payload.skill_keys?.length ? payload.skill_keys : undefined,
      })
        .then((entry) => {
          setActivity((prev) => mergeActivityEntry(prev, entry))
          onActivityEntryAdded?.(entry)
        })
        .catch(() => {})
    },
    [
      spaceId,
      itemId,
      onActivityEntryAdded,
      onSendExternalComment,
      authProfile.displayName,
      loadActivity,
    ],
  )

  const handleAssignToMeFromComposer = useCallback(() => {
    if (!currentUserId) return
    void updateSpaceItem(spaceId, itemId, {
      assignee_type: 'human',
      assignee_id: currentUserId,
      assignees: [{ type: 'human', id: currentUserId }],
    }).catch(() => {})
  }, [currentUserId, spaceId, itemId])

  const handleSetStatusFromComposer = useCallback(
    (status: string) => {
      void updateSpaceItem(spaceId, itemId, { status }).catch(() => {})
    },
    [spaceId, itemId],
  )

  const handleCommentUpdated = useCallback((updated: SpaceItemActivity) => {
    setActivity((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
  }, [])

  const handleCommentDeleted = useCallback((activityId: string) => {
    setActivity((prev) => prev.filter((row) => row.id !== activityId))
  }, [])

  const handleStopAgent = useCallback(
    async (activityId: string) => {
      if (stoppingAgentActivityId) return
      setStoppingAgentActivityId(activityId)
      try {
        const result = await cancelTaskAgent(spaceId, itemId)
        if (result.cancelled) {
          setActivity((prev) =>
            prev.map((row) =>
              row.id === activityId
                ? { ...row, payload: { ...row.payload, status: 'cancelled' } }
                : row,
            ),
          )
        }
        await loadActivity()
      } catch {
        /* keep current running state; realtime or retry can recover */
      } finally {
        setStoppingAgentActivityId(null)
      }
    },
    [spaceId, itemId, loadActivity, stoppingAgentActivityId],
  )

  return {
    loading,
    merged,
    authProfile,
    rosterAvatars,
    composerMembers,
    stoppingAgentActivityId,
    handleAssignToMeFromComposer,
    handleCommentDeleted,
    handleCommentUpdated,
    handleComposerSend,
    handleSetStatusFromComposer,
    handleStopAgent,
  }
}
