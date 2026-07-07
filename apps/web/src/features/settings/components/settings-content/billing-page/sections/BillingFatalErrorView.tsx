'use client'

import { AlertCircle } from 'lucide-react'

export function BillingFatalErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <div className="surface-card gap-spacing-3 rounded-spacing-2 border-destructive/30 p-spacing-8 flex flex-col items-center border">
        <AlertCircle className="text-destructive h-8 w-8" />
        <p className="body-1 text-foreground">Something went wrong</p>
        <p className="body-3 text-muted-foreground">{error}</p>
        <button
          onClick={onRetry}
          className="body-2 mt-spacing-2 rounded-spacing-2 bg-secondary px-spacing-4 py-spacing-2 text-foreground font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
