'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  sortAgentsForTeamDmList,
  useAgentMenuActions,
  useCachedMissionAgents,
  useDmList,
  useDmUnread,
  useTeam2Perms,
  useTeams,
  type MissionAgentSidebar,
} from '@/lib/agents'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { orgService, useAccountContextGate, useOrgPeople, useOrgStore, type OrgMember } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { useSidebarTeam2Bootstrap } from './useSidebarTeam2Bootstrap'

const ORG_MEMBERS_CACHE_TTL_MS = 60_000

interface UseSidebarTeam2FlyoutDataInput {
  pathname: string
}

export function useSidebarTeam2FlyoutData({ pathname }: UseSidebarTeam2FlyoutDataInput) {
  const searchParams = useSearchParams()
  const { getAgentMenuContext, handleRename, favoriteIds } = useAgentMenuActions()
  const { isAccountContextReady, isPersonalAccountContext, isOrgAccountContext } =
    useAccountContextGate()
  const { loading: bootstrapLoading, error: bootstrapError } = useSidebarTeam2Bootstrap(
    isAccountContextReady && isOrgAccountContext,
  )
  const fallbackFetch = isAccountContextReady && (isPersonalAccountContext || !!bootstrapError)
  const showOrgCollaboration = isAccountContextReady && isOrgAccountContext
  const {
    teams,
    loading: teamsLoading,
    create,
    rename,
    recolor,
    reicon,
    remove,
  } = useTeams(showOrgCollaboration && fallbackFetch)
  const { canEditTeam, canManageTeamMembers } = useTeam2Perms()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const hasMinRole = useOrgStore((s) => s.hasMinRole)
  const canManageOrgMembers = hasMinRole('admin')

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const orgMembersEnabled = showOrgCollaboration && canManageOrgMembers
  const loadOrgMembers = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!activeOrgId || !orgMembersEnabled) return
      const cacheKey = `org-members:${activeOrgId}`
      if (opts?.force) invalidateCachedFetch(cacheKey)
      try {
        const res = await cachedFetch(cacheKey, () => orgService.listMembers(activeOrgId), {
          ttlMs: ORG_MEMBERS_CACHE_TTL_MS,
        })
        if (res.success) setOrgMembers(res.members)
      } catch {
        /* non-fatal - member menus simply stay hidden */
      }
    },
    [activeOrgId, orgMembersEnabled],
  )

  useEffect(() => {
    void loadOrgMembers()
  }, [loadOrgMembers])

  const getMemberByUserId = useCallback(
    (userId: string) => orgMembers.find((m) => m.user_id === userId) ?? null,
    [orgMembers],
  )

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // getSession reads the local JWT; auth.getUser would hit /auth/v1/user.
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.user) setCurrentUserId(data.session.user.id)
      })
  }, [])

  const { data: agentsData, loading: agentsLoading } = useCachedMissionAgents(fallbackFetch)
  const agents: MissionAgentSidebar[] = agentsData ?? []
  const sortedAgents = useMemo(
    () => sortAgentsForTeamDmList(agents, favoriteIds),
    [agents, favoriteIds],
  )
  const { people, loading: peopleLoading } = useOrgPeople(showOrgCollaboration && fallbackFetch)
  const { dms } = useDmList(showOrgCollaboration && fallbackFetch)
  const { counts: dmUnreadCounts, markRead: markDmRead } = useDmUnread(
    showOrgCollaboration && fallbackFetch,
  )
  const unreadByPartnerId = useMemo(() => {
    const out: Record<string, number> = {}
    for (const dm of dms) {
      const unread = dmUnreadCounts[dm.conversation_id] ?? 0
      if (unread > 0) out[dm.partner.id] = unread
    }
    return out
  }, [dms, dmUnreadCounts])
  const activeAgentKey = useMemo(() => searchParams.get('agent'), [searchParams])
  const activeDmUserId = useMemo(() => {
    const m = pathname.match(/dm=([^&]+)/)
    return m ? m[1] : null
  }, [pathname])

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) => {
        if (a.is_system && !b.is_system) return -1
        if (!a.is_system && b.is_system) return 1
        return a.name.localeCompare(b.name)
      }),
    [teams],
  )

  const markPersonDmRead = useCallback(
    async (userId: string) => {
      const conversationId = dms.find((dm) => dm.partner.id === userId)?.conversation_id
      if (conversationId) await markDmRead(conversationId)
    },
    [dms, markDmRead],
  )

  return {
    activeAgentKey,
    activeDmUserId,
    activeOrgId,
    agentsLoading,
    bootstrapLoading,
    canEditTeam,
    canManageOrgMembers,
    canManageTeamMembers,
    create,
    currentUserId,
    fallbackFetch,
    favoriteIds,
    getAgentMenuContext,
    getMemberByUserId,
    handleRename,
    loadOrgMembers,
    markPersonDmRead,
    people,
    peopleLoading,
    recolor,
    reicon,
    remove,
    rename,
    showOrgCollaboration,
    sortedAgents,
    sortedTeams,
    teamsLoading,
    unreadByPartnerId,
  }
}
