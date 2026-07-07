'use client'

import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { getChannelIconColorId, getChannelIconName, type ChannelIconSource } from '@/lib/channels'
import { cn } from '@/lib/utils/cn'

export function ChannelIcon({
  channel,
  className,
}: {
  channel: ChannelIconSource | null | undefined
  className?: string
}) {
  const iconName = getChannelIconName(channel)
  const palette = getIconColor(getChannelIconColorId(channel))
  return <LucideIcon name={iconName} className={cn(palette.textColor, className)} aria-hidden />
}
