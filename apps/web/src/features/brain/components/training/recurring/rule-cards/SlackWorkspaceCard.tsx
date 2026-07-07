'use client'

import { useState } from 'react'
import { Plug, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { cn } from '@/lib/utils/cn'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { setSlackAutoIngest } from '../../../../services/recurring-rules.service'
import { SlackSenderResolution } from './SlackRuleCard'

export function SlackWorkspaceCard({
  slackConnected,
  slackTeamName,
  slackAutoIngest,
  onRefresh,
  onOpenIntegrations,
  onAddMapping,
}: {
  slackConnected: boolean
  slackTeamName: string | null
  slackAutoIngest: boolean
  onRefresh: () => Promise<void>
  onOpenIntegrations: () => void
  onAddMapping: () => void
}) {
  const [showSenders, setShowSenders] = useState(false)
  const [savingAuto, setSavingAuto] = useState(false)

  const toggleAuto = async (enabled: boolean) => {
    setSavingAuto(true)
    try {
      const next = await setSlackAutoIngest(enabled)
      await onRefresh()
      toast.success(next ? 'Slack training is on.' : 'Slack training is paused.')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not update Slack training.'))
    } finally {
      setSavingAuto(false)
    }
  }

  return (
    <div className="border-border rounded-spacing-3 surface-card overflow-hidden border">
      <div className="p-spacing-3 gap-spacing-3 flex items-center">
        <div className="min-w-0 flex-1">
          <div className="gap-spacing-2 flex flex-wrap items-center">
            <p className="body-2 text-foreground min-w-0 truncate font-semibold">
              Slack recurring training
            </p>
            <span
              className={cn(
                'badge-glass badge-glass-sm shrink-0',
                slackConnected && slackAutoIngest ? 'badge-glass-green' : 'badge-glass-muted',
              )}
            >
              {slackConnected && slackAutoIngest ? 'On' : 'Off'}
            </span>
            <span className="badge-glass badge-glass-sm badge-glass-muted shrink-0">
              {slackConnected ? (slackTeamName ?? 'Connected') : 'Not connected'}
            </span>
          </div>
          <p className="typo-caption text-muted-foreground mt-spacing-1">
            Slack · Channel mappings
          </p>
        </div>
      </div>

      <div className="border-border p-spacing-3 space-y-spacing-3 border-t">
        {slackConnected ? (
          <div className="flex items-center justify-between">
            <span className="body-3 text-foreground">Auto-sync</span>
            <Switch checked={slackAutoIngest} disabled={savingAuto} onCheckedChange={toggleAuto} />
          </div>
        ) : (
          <p className="body-4 text-muted-foreground">
            Connect Slack in Integrations to use recurring training.
          </p>
        )}

        <div className="gap-spacing-2 flex flex-wrap items-center">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="button-compact button-glass-neutral"
          >
            <RefreshCw className="icon-xs" />
            Refresh
          </button>
          {slackConnected ? (
            <button
              type="button"
              onClick={onAddMapping}
              className="button-compact button-glass-primary"
            >
              <Plus className="icon-xs" />
              Add Slack mapping
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenIntegrations}
              className="button-compact button-glass-primary"
            >
              <Plug className="icon-xs" />
              Connect Slack
            </button>
          )}
        </div>

        {slackConnected ? (
          <SlackSenderResolution open={showSenders} onOpenChange={setShowSenders} />
        ) : null}
      </div>
    </div>
  )
}
