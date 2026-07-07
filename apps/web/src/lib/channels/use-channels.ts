'use client'

import { useCallback } from 'react'
import { createCachedResource } from '@/lib/cache/cached-resource'
import {
  channelsService,
  type Channel,
  type CreateChannelPayload,
  type UpdateChannelPayload,
} from './channels-api'

const channelsResource = createCachedResource<Channel[]>(() => channelsService.listChannels(), {
  ttlMs: 60_000,
})

export const channelsCache = {
  invalidate: () => channelsResource.invalidate(),
  reload: () => channelsResource.reload(),
  peek: () => channelsResource.peek(),
  mutate: (next: Channel[] | ((prev: Channel[] | undefined) => Channel[])) =>
    channelsResource.mutate(next),
}

export function useChannels(enabled = true) {
  const { data, loading, error, reload } = channelsResource.use({ enabled })

  const createChannel = useCallback(async (payload: CreateChannelPayload) => {
    const { channel } = await channelsService.createChannel(payload)
    const withManage = { ...channel, can_manage: true }
    channelsResource.mutate((prev) =>
      [...(prev ?? []), withManage].sort((a, b) => a.name.localeCompare(b.name)),
    )
    return withManage
  }, [])

  const updateChannel = useCallback(async (channelId: string, payload: UpdateChannelPayload) => {
    const applyBindingPatch = (metadata: Record<string, unknown>): Record<string, unknown> => {
      if (payload.default_campaign_id === undefined) return metadata
      const next = { ...metadata }
      if (payload.default_campaign_id) {
        next.default_campaign_id = payload.default_campaign_id
      } else {
        delete next.default_campaign_id
      }
      return next
    }

    const applyOptimistic = (item: Channel): Channel => ({
      ...item,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.is_private !== undefined ? { is_private: payload.is_private } : {}),
      ...(payload.icon !== undefined ||
      payload.icon_color !== undefined ||
      payload.default_campaign_id !== undefined
        ? {
            metadata: applyBindingPatch({
              ...(item.metadata ?? {}),
              ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
              ...(payload.icon_color !== undefined ? { icon_color: payload.icon_color } : {}),
            }),
          }
        : {}),
    })

    channelsResource.mutate((prev) =>
      (prev ?? []).map((item) => (item.id === channelId ? applyOptimistic(item) : item)),
    )

    const { channel } = await channelsService.updateChannel(channelId, payload)
    channelsResource.mutate((prev) =>
      (prev ?? []).map((item) =>
        item.id === channelId
          ? {
              ...item,
              ...channel,
              // applyBindingPatch again: a cleared binding must not be
              // resurrected from the stale cached metadata by the spread merge.
              metadata: applyBindingPatch({
                ...(item.metadata ?? {}),
                ...(channel.metadata ?? {}),
              }),
              can_manage: channel.can_manage ?? item.can_manage,
            }
          : item,
      ),
    )
    return channel
  }, [])

  const deleteChannel = useCallback(async (channelId: string) => {
    await channelsService.deleteChannel(channelId)
    channelsResource.mutate((prev) => (prev ?? []).filter((item) => item.id !== channelId))
  }, [])

  const toggleChannelFavorite = useCallback(async (channelId: string) => {
    const current = channelsResource.peek()?.find((item) => item.id === channelId)
    const next = !current?.is_favorite
    channelsResource.mutate((prev) =>
      (prev ?? []).map((item) => (item.id === channelId ? { ...item, is_favorite: next } : item)),
    )
    await channelsService.updateChannelUserState(channelId, { is_favorite: next })
  }, [])

  return {
    channels: data ?? [],
    loading,
    error,
    reload,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannelFavorite,
  }
}
