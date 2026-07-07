type SchemaView = {
  id: string
  type: string
  name: string
  channel_config?: { channel_id: string }
  channels_config?: { channel_ids: string[]; active_channel_id?: string }
  [key: string]: unknown
}

type SpaceSchema = {
  version: number
  fields?: unknown[]
  views: SchemaView[]
  icon?: string
  icon_color?: string
  [key: string]: unknown
}

export function wireChannelIntoSchema(schema: SpaceSchema, channelId: string): SpaceSchema {
  return {
    ...schema,
    views: schema.views.map((view) => {
      if (view.type === 'channel') {
        return {
          ...view,
          channel_config: { channel_id: channelId },
          channels_config: undefined,
        }
      }
      if (view.type === 'channels') {
        const ids = view.channels_config?.channel_ids ?? []
        const nextIds = ids.includes(channelId) ? ids : [channelId, ...ids]
        const active = view.channels_config?.active_channel_id
        return {
          ...view,
          channels_config: {
            ...view.channels_config,
            channel_ids: nextIds,
            active_channel_id: active && nextIds.includes(active) ? active : channelId,
          },
          channel_config: undefined,
        }
      }
      return view
    }),
  }
}

export function stripChannelViews(schema: SpaceSchema): SpaceSchema {
  return {
    ...schema,
    views: schema.views.filter((v) => v.type !== 'channel' && v.type !== 'channels'),
  }
}
