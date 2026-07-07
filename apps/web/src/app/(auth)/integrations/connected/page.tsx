'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  broadcastIntegrationOAuthEvent,
  type IntegrationOAuthEvent,
} from '@/lib/integrations/composio-oauth'

const CLOSE_DELAY_MS = 1500

function IntegrationConnectedContent() {
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<'pending' | 'done' | 'error'>('pending')

  useEffect(() => {
    const integrationId = searchParams.get('integration')
    const composioError = searchParams.get('composio_error')
    const composioErrorMessage =
      searchParams.get('composio_error_message') || composioError || 'Connection failed'
    const redirectToRaw = searchParams.get('redirect_to')
    const isSuccess = searchParams.get('composio_connected') === '1' && !composioError

    let event: IntegrationOAuthEvent
    if (isSuccess) {
      event = { type: 'connected', integrationId: integrationId ?? '' }
      setPhase('done')
    } else if (composioError) {
      event = { type: 'error', integrationId, message: composioErrorMessage }
      setPhase('error')
    } else {
      setPhase('error')
      return
    }

    broadcastIntegrationOAuthEvent(event)

    const timer = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.close()
        return
      }

      window.close()

      if (redirectToRaw) {
        try {
          const target = new URL(redirectToRaw)
          target.searchParams.delete('composio_connected')
          target.searchParams.delete('composio_error')
          target.searchParams.delete('composio_error_message')
          target.searchParams.delete('integration')
          window.location.replace(target.toString())
        } catch {
          window.location.replace('/')
        }
      }
    }, CLOSE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [searchParams])

  if (phase === 'error') {
    return (
      <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
        <div className="h-spacing-10 w-spacing-10 bg-destructive/10 mx-auto flex items-center justify-center rounded-full">
          <XCircle className="icon-lg text-destructive" aria-hidden />
        </div>
        <h1 className="title-h6 text-foreground mt-spacing-4">CONNECTION FAILED</h1>
        <p className="body-2 mt-spacing-3 text-muted-foreground">
          Close this tab and try again from Integrations.
        </p>
      </section>
    )
  }

  return (
    <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
      <div className="h-spacing-10 w-spacing-10 bg-primary/10 mx-auto flex items-center justify-center rounded-full">
        <CheckCircle2 className="icon-lg text-primary" aria-hidden />
      </div>
      <h1 className="title-h6 text-foreground mt-spacing-4">CONNECTED SUCCESSFULLY</h1>
      <p className="body-2 mt-spacing-3 text-muted-foreground">
        You can close this tab and return to Vibey.
      </p>
      <p className="body-4 mt-spacing-2 text-muted-foreground">Closing&hellip;</p>
    </section>
  )
}

export default function IntegrationConnectedPage() {
  return (
    <Suspense
      fallback={
        <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
          <p className="body-2 text-muted-foreground">Finishing connection&hellip;</p>
        </section>
      }
    >
      <IntegrationConnectedContent />
    </Suspense>
  )
}
