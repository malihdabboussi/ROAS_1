import type { IconColorId } from '@/components/ui/IconPicker'

export interface ChannelIconSource {
  metadata: Record<string, unknown> | null
}

export const DEFAULT_CHANNEL_ICON = 'hash'

export function getChannelIconName(
  channel: Pick<ChannelIconSource, 'metadata'> | null | undefined,
): string {
  const raw = channel?.metadata?.icon
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : DEFAULT_CHANNEL_ICON
}

export function getChannelIconColorId(
  channel: Pick<ChannelIconSource, 'metadata'> | null | undefined,
): IconColorId {
  const raw = channel?.metadata?.icon_color
  return typeof raw === 'string' && raw.length > 0 ? (raw as IconColorId) : 'default'
}
