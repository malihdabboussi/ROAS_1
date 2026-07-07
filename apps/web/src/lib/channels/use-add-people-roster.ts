'use client'

import { useEffect, useMemo, useState } from 'react'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team'

export function useAddPeopleRoster(open: boolean) {
  const getActiveOrg = useOrgStore((state) => state.getActiveOrg)
  const workspaceName = getActiveOrg()?.organizations.name ?? 'your workspace'
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [rosterLoaded, setRosterLoaded] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setCurrentUserId(data.user?.id ?? null)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || rosterLoaded) return
    let cancelled = false

    void cachedFetch('team-roster:all', () => fetchTeamRoster({ kind: 'all' }))
      .then((rows) => {
        if (cancelled) return
        setRoster(rows)
        setRosterLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setRosterLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [open, rosterLoaded])

  return useMemo(
    () => ({
      currentUserId,
      roster,
      rosterLoaded,
      workspaceName,
    }),
    [currentUserId, roster, rosterLoaded, workspaceName],
  )
}
