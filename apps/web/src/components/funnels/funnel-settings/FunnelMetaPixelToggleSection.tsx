'use client'

import { Megaphone } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { Funnel } from '@/lib/artifacts/artifact-types'

export function FunnelMetaPixelToggleSection(props: {
  funnel: Funnel
  enabled: boolean
  onToggle: (funnelId: string, enabled: boolean) => void
}) {
  const { funnel, enabled, onToggle } = props
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Megaphone className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="body-3 text-[var(--foreground)]">Meta Pixel</span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => {
          void onToggle(funnel.id, checked)
        }}
      />
    </div>
  )
}
