'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/log-client-error'

/**
 * Root error boundary — replaces the unbranded Next.js
 * "Application error: a client-side exception has occurred" white screen
 * with a recoverable, branded state.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void reportClientError({
      feature: 'root-error-boundary',
      message: error.message || 'Unhandled client error',
      error,
      source_context: error.digest ? { digest: error.digest } : undefined,
    })
  }, [error])

  return (
    <main className="bg-background gap-spacing-4 flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="gap-spacing-1 flex flex-col">
        <h1 className="title-h5 text-foreground">SOMETHING WENT WRONG</h1>
        <p className="body-2 text-muted-foreground max-w-sm">
          This screen hit an unexpected error. Your work is safe — try again, or head back home.
        </p>
      </div>
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={reset}
          className="button-default button-glass-primary body-3"
        >
          Try again
        </button>
        <a href="/home" className="button-default button-glass-neutral body-3">
          Back to Home
        </a>
      </div>
    </main>
  )
}
