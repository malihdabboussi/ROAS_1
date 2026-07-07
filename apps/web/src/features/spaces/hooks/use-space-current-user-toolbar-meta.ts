import { useEffect, useMemo, useState } from 'react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { createClient } from '@/lib/supabase/client'
import type { ViewDef } from '../types/space-schema'

export function useSpaceCurrentUserToolbarMeta(
  roster: TeamRosterEntry[],
  currentUserId: string | null,
  activeView: ViewDef | null,
) {
  const [authProfileForToolbar, setAuthProfileForToolbar] = useState<{
    avatarUrl: string | null
    displayLabel: string
  }>({ avatarUrl: null, displayLabel: '' })

  useEffect(() => {
    let cancelled = false
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled || !user) return
        const meta = user.user_metadata as Record<string, unknown> | undefined
        const urlRaw = meta?.avatar_url ?? meta?.picture
        const nameRaw = meta?.full_name ?? meta?.name ?? user.email?.split('@')[0] ?? ''
        setAuthProfileForToolbar({
          avatarUrl: typeof urlRaw === 'string' && urlRaw.length > 0 ? urlRaw : null,
          displayLabel: typeof nameRaw === 'string' ? nameRaw : '',
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentUserRosterEntry = useMemo(
    () => roster.find((r) => r.kind === 'human' && r.user_id === currentUserId) ?? null,
    [roster, currentUserId],
  )

  const toolbarMeAvatarUrl = currentUserRosterEntry?.avatar_url ?? authProfileForToolbar.avatarUrl

  const toolbarMeInitials = useMemo(() => {
    const name = (currentUserRosterEntry?.display_name ?? authProfileForToolbar.displayLabel).trim()
    if (!name) return '?'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.[0]
      const b = parts[parts.length - 1]?.[0]
      if (a && b) return (a + b).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }, [currentUserRosterEntry?.display_name, authProfileForToolbar.displayLabel])

  const toolbarAssigneeAvatars = useMemo(() => {
    if (activeView?.type === 'missions') {
      const keys = activeView.missions_config?.toolbar_filter_agent_keys ?? []
      return keys
        .map((k) => roster.find((r) => r.agent_key === k))
        .filter((e): e is NonNullable<typeof e> => !!e)
        .slice(0, 3)
    }
    const ids = activeView?.toolbar_filter_assignee_participant_ids ?? []
    return ids
      .map((id) => roster.find((r) => r.participant_id === id))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .slice(0, 3)
  }, [activeView, roster])

  return {
    authProfileForToolbar,
    toolbarMeAvatarUrl,
    toolbarMeInitials,
    toolbarAssigneeAvatars,
  }
}
