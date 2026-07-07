'use client'

import { Switch } from '@/components/ui/forms/switch'
import type { Presentation } from '@/lib/artifacts/artifact-types'

interface PresentationBrandingSectionProps {
  presentation: Presentation
  isSaving: boolean
  isFreeUser: boolean
  onToggleBranding: (presentationId: string, hideBranding: boolean) => Promise<void> | void
}

export function PresentationBrandingSection({
  presentation,
  isSaving,
  isFreeUser,
  onToggleBranding,
}: PresentationBrandingSectionProps) {
  return (
    <div className="space-y-spacing-2 pt-spacing-4 border-border border-t">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <span className="body-3 text-foreground block font-medium">
            Remove &quot;Made with Vibey&quot;
          </span>
          <span className="body-3 text-muted-foreground mt-spacing-1 block">
            Hide the watermark on published presentation pages.
          </span>
        </div>
        <div className="gap-spacing-2 flex items-center">
          {isSaving && <span className="body-3 text-muted-foreground">Saving...</span>}
          <Switch
            checked={!!presentation.hide_branding}
            disabled={isFreeUser}
            onCheckedChange={(checked) => {
              void onToggleBranding(presentation.id, checked)
            }}
          />
        </div>
      </div>
    </div>
  )
}
