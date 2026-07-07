'use client'

import { Loader2, Plus } from 'lucide-react'

interface BulkCreatorActionsProps {
  acceptedCount: number
  isCreating: boolean
  onCreateAds: () => void
  onStartOver: () => void
  createLabel?: string
}

export function BulkCreatorActions({
  acceptedCount,
  isCreating,
  onCreateAds,
  createLabel,
}: BulkCreatorActionsProps) {
  const defaultLabel = `Create ${acceptedCount} Ad${acceptedCount !== 1 ? 's' : ''}`

  return (
    <button
      type="button"
      disabled={acceptedCount === 0 || isCreating}
      onClick={onCreateAds}
      className="chip-glass-blue h-spacing-10 rounded-spacing-3 flex w-full items-center justify-center gap-2 font-semibold transition-all disabled:opacity-40"
    >
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating {acceptedCount} Ads...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          {createLabel ?? defaultLabel}
        </>
      )}
    </button>
  )
}
