'use client'

import { SiSlack, SiTelegram } from 'react-icons/si'

export function ConversationChannelIcon({
  metadata,
}: {
  metadata?: Record<string, unknown> | null
}) {
  const source = metadata?.source
  if (source === 'slack')
    return <SiSlack className="icon-sm shrink-0 text-purple-400" aria-hidden />
  if (source === 'telegram')
    return <SiTelegram className="icon-sm shrink-0 text-blue-400" aria-hidden />
  return null
}
