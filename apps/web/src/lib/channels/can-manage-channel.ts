'use client'

import { useEffect, useState } from 'react'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import type { Channel } from './channels-api'

export function canManageChannelLocally(
  channel: Channel | null | undefined,
  opts?: { currentUserId?: string | null; hasOrgAdmin?: boolean },
): boolean {
  if (!channel) return false
  if (channel.can_manage === true) return true
  if (opts?.hasOrgAdmin ?? useOrgStore.getState().hasMinRole('admin')) return true
  const userId = opts?.currentUserId ?? null
  if (userId && channel.user_id === userId) return true
  return false
}

function useCurrentUserId() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setCurrentUserId(data.session?.user.id ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return currentUserId
}

export function useCanManageChannel(channel: Channel | null | undefined): boolean {
  const hasOrgAdmin = useOrgStore((s) => s.hasMinRole('admin'))
  const currentUserId = useCurrentUserId()

  return canManageChannelLocally(channel, { currentUserId, hasOrgAdmin })
}
