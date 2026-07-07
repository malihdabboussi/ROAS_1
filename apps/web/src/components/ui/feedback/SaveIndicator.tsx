'use client'

import { Check, Loader2 } from 'lucide-react'

export type SaveIndicatorStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SaveIndicator({ status }: { status: SaveIndicatorStatus }) {
  if (status === 'idle') return null
  return (
    <span className="typo-caption flex items-center gap-1 transition-opacity">
      {status === 'saving' && (
        <>
          <Loader2 className="icon-xs text-muted-foreground animate-spin" />
          <span className="text-muted-foreground">Saving</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="icon-xs text-success" />
          <span className="text-success">Saved</span>
        </>
      )}
      {status === 'error' && <span className="text-destructive">Save failed</span>}
    </span>
  )
}
