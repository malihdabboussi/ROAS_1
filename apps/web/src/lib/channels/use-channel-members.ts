'use client'

import { useCallback, useEffect, useState } from 'react'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  channelsService,
  type AddChannelMemberPayload,
  type ChannelMember,
} from './channels-api'

export function useChannelMembers(channelId: string | null) {
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!channelId) {
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // ttl 0 = dedupe-only: concurrent hook instances (page awareness +
      // chat container, StrictMode double-effects) share one request.
      const rows = await cachedFetch(`channel-members:${channelId}`, () =>
        channelsService.listMembers(channelId),
      )
      setMembers(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.')
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    void reload()
  }, [reload])

  const addMember = useCallback(
    async (payload: AddChannelMemberPayload) => {
      if (!channelId) return null
      const { member } = await channelsService.addMember(channelId, payload)
      setMembers((prev) => {
        const exists = prev.some((item) => item.id === member.id)
        return exists ? prev : [...prev, member]
      })
      return member
    },
    [channelId],
  )

  const updateMemberRole = useCallback(
    async (memberId: string, role: 'admin' | 'edit' | 'view') => {
      if (!channelId) return null
      const { member } = await channelsService.updateMemberRole(channelId, memberId, role)
      setMembers((prev) => prev.map((item) => (item.id === member.id ? member : item)))
      return member
    },
    [channelId],
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!channelId) return
      await channelsService.removeMember(channelId, memberId)
      setMembers((prev) => prev.filter((item) => item.id !== memberId))
    },
    [channelId],
  )

  return {
    members,
    loading,
    error,
    reload,
    addMember,
    updateMemberRole,
    removeMember,
    setMembers,
  }
}
