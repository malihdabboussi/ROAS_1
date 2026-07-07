import type { ViewDef } from '../types/space-schema'

export function getChannelIdsFromView(view: ViewDef): string[] {
  if (view.type === 'channel') {
    const id = view.channel_config?.channel_id
    return id ? [id] : []
  }
  if (view.type === 'channels') {
    return view.channels_config?.channel_ids ?? []
  }
  return []
}

/** Morph between single `channel` and multi `channels` views based on pinned count. */
export function buildSpaceChannelViewPatch(
  view: ViewDef,
  nextIds: string[],
  activeChannelId?: string | null,
): Partial<ViewDef> {
  const resolvedActive =
    activeChannelId && nextIds.includes(activeChannelId) ? activeChannelId : nextIds[0]

  if (nextIds.length <= 1) {
    return {
      type: 'channel',
      channel_config: nextIds[0] ? { channel_id: nextIds[0] } : undefined,
      channels_config: undefined,
    }
  }

  return {
    type: 'channels',
    channels_config: {
      ...(view.channels_config ?? {}),
      channel_ids: nextIds,
      active_channel_id: resolvedActive,
    },
    channel_config: undefined,
  }
}
