'use client'

import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  syncFireflies,
  type RecurringTrainingRule,
} from '../../../../services/recurring-rules.service'

export function FirefliesRuleCard({
  rule,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'fireflies_sync' }>
}) {
  const [syncing, setSyncing] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const sync = async () => {
    setSyncing(true)
    try {
      const res = await syncFireflies()
      toast.success(`Synced ${res.synced} meetings (${res.skipped} already processed).`)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not sync Fireflies.'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="border-border p-spacing-3 space-y-spacing-3 border-t">
      <div className="flex items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <span className="body-3 text-foreground">Manual meeting sync</span>
          <button
            type="button"
            onClick={() => setShowInfo((value) => !value)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Explain Fireflies sync"
          >
            <Info className="icon-xs" />
          </button>
        </div>
        <button
          type="button"
          disabled={!rule.connected || syncing}
          onClick={sync}
          className="button-compact button-glass-primary disabled:opacity-50"
        >
          {syncing ? <Loader2 className="icon-xs animate-spin" /> : null}
          {syncing ? 'Syncing' : 'Sync now'}
        </button>
      </div>
      {showInfo ? (
        <div className="surface-bg rounded-spacing-2 p-spacing-3">
          <p className="body-3 text-muted-foreground">
            Fireflies does not support webhooks, so syncing is manual. New transcripts are checked
            for duplicates, then sent through the same crystallization pipeline.
          </p>
        </div>
      ) : null}
      {!rule.connected ? (
        <p className="body-4 text-muted-foreground">
          Connect Fireflies in Integrations to use this rule.
        </p>
      ) : null}
    </div>
  )
}
