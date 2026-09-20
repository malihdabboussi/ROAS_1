'use client'

import { useEffect, useState } from 'react'
import { SETTINGS_TOAST_ERRORS } from '@/features/settings/config/settings-toast-errors.config'
import { fetchMeetingWebhookAddress } from '@/lib/integrations/meeting-provider-definitions'

/**
 * Shown inside the connect dialog of a defined note taker: the address to
 * paste into the tool, available before the secret is entered.
 */
export function MeetingWebhookAddressNote({ provider, name }: { provider: string; name: string }) {
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setAddress(null)
    setError(null)
    fetchMeetingWebhookAddress(provider)
      .then((url) => {
        if (!cancelled) setAddress(url)
      })
      .catch(() => {
        if (!cancelled) setError(SETTINGS_TOAST_ERRORS.NOTE_TAKER_ADDRESS_FAILED.userMessage)
      })
    return () => {
      cancelled = true
    }
  }, [provider])

  return (
    <div className="rounded-spacing-2 border-border bg-secondary p-spacing-3 space-y-spacing-1 border">
      <p className="body-3 text-foreground font-medium">1. Give {name} this address</p>
      <p className="body-4 text-muted-foreground">
        Create a webhook in {name} that posts finished meetings here. Then paste the signing secret
        below: the one {name} shows for the webhook, or the one you set there.
      </p>
      {address ? (
        <code className="body-4 text-foreground break-all font-mono" data-testid="webhook-address">
          {address}
        </code>
      ) : error ? (
        <p className="body-4 text-destructive">{error}</p>
      ) : (
        <p className="body-4 text-muted-foreground">Preparing your address…</p>
      )}
    </div>
  )
}
