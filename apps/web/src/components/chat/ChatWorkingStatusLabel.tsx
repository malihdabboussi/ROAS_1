'use client'

import { TypewriterShimmer } from '@/components/chat/TypewriterShimmer'
import { useWorkingStatusLabel } from '@/lib/chat/use-working-status-label'

export function ChatWorkingStatusLabel({
  pinned,
  active,
  idleText,
}: {
  pinned: string | null | undefined
  active: boolean
  idleText?: string
}) {
  const workingText = useWorkingStatusLabel(pinned, active)
  if (!active) {
    return (
      <span className="body-3 text-muted-foreground font-medium">{idleText ?? pinned ?? ''}</span>
    )
  }
  return <TypewriterShimmer key={workingText} text={workingText} />
}
