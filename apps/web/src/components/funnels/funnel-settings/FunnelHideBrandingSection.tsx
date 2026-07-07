'use client'

import { Stamp } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { Funnel } from '@/lib/artifacts/artifact-types'

export function FunnelHideBrandingSection(props: {
  funnel: Funnel
  isFreeUser: boolean
  onToggle: (funnelId: string, hideBranding: boolean) => void
}) {
  const { funnel, isFreeUser, onToggle } = props
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Stamp className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="body-3 text-[var(--foreground)]">
          Remove &quot;Made with Vibey&quot;
        </span>
      </div>
      <Switch
        checked={!!funnel.hide_branding}
        disabled={isFreeUser}
        onCheckedChange={(checked) => {
          void onToggle(funnel.id, checked)
        }}
      />
    </div>
  )
}
