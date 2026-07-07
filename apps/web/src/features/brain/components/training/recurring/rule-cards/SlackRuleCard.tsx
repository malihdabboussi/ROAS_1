'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  deleteSlackMapping,
  listSlackTrainingChannels,
  listSlackTrainingSenders,
  saveSlackTrainingMapping,
  syncSlackMapping,
  type RecurringTrainingCadence,
  type RecurringTrainingRule,
  type RecurringTrainingTargetKind,
  type SlackTrainingChannel,
  type SlackTrainingDestination,
  type SlackTrainingSender,
} from '../../../../services/recurring-rules.service'

export function SlackRuleCard({
  rule,
  onRefresh,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'slack' }>
  onRefresh: () => Promise<void>
}) {
  const [syncing, setSyncing] = useState(false)
  const [removing, setRemoving] = useState(false)

  const sync = async () => {
    setSyncing(true)
    try {
      await syncSlackMapping(rule.mapping.id)
      await onRefresh()
      toast.success('Slack training job queued.')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not queue Slack training.'))
    } finally {
      setSyncing(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      await deleteSlackMapping(rule.mapping.id)
      await onRefresh()
      toast.success('Slack mapping removed.')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not remove Slack mapping.'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="border-border p-spacing-3 space-y-spacing-3 border-t">
      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <div>
          <p className="body-3 text-foreground font-medium">#{rule.mapping.slack_channel_name}</p>
          <p className="body-4 text-muted-foreground">
            Routes to {rule.destinationLabel} every {rule.mapping.cadence}.
          </p>
        </div>
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            onClick={sync}
            disabled={!rule.connected || syncing || removing}
            className="button-compact button-glass-primary disabled:opacity-50"
          >
            {syncing ? <Loader2 className="icon-xs animate-spin" /> : null}
            {syncing ? 'Syncing' : 'Sync now'}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={syncing || removing}
            className="button-compact button-glass-destructive disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="icon-xs animate-spin" />
            ) : (
              <Trash2 className="icon-xs" />
            )}
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function SlackSenderResolution({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [senders, setSenders] = useState<SlackTrainingSender[]>([])
  const [loading, setLoading] = useState(false)

  const summary = useMemo(() => {
    const contacts = senders.filter((sender) => sender.contactId).length
    const unmapped = senders.length - contacts
    return `${contacts} contacts · ${unmapped} unmapped`
  }, [senders])

  const toggle = async () => {
    const next = !open
    onOpenChange(next)
    if (!next || senders.length > 0) return
    setLoading(true)
    try {
      setSenders(await listSlackTrainingSenders())
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not load Slack senders.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-spacing-2">
      <button
        type="button"
        onClick={toggle}
        className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 flex items-center"
      >
        <ChevronDown className={`icon-xs transition-transform ${open ? 'rotate-180' : ''}`} />
        Sender resolution ({summary})
      </button>
      {open ? (
        <div className="border-border overflow-hidden rounded-lg border">
          {loading ? (
            <div className="p-spacing-4 flex justify-center">
              <Loader2 className="icon-sm text-muted-foreground animate-spin" />
            </div>
          ) : senders.length === 0 ? (
            <p className="body-3 text-muted-foreground p-spacing-4 text-center">
              No senders found.
            </p>
          ) : (
            senders.map((sender) => (
              <div
                key={sender.slackUserId}
                className="border-border gap-spacing-3 px-spacing-4 py-spacing-3 flex items-center justify-between border-b last:border-0"
              >
                <div>
                  <p className="body-3 text-foreground font-medium">{sender.displayName}</p>
                  <p className="body-4 text-muted-foreground">
                    {sender.email ?? sender.slackUserId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="body-3 text-muted-foreground">{sender.contactRole ?? 'unmapped'}</p>
                  <p className="body-4 text-muted-foreground">
                    {sender.qualifiesForCustomerBrain
                      ? '→ Customer brain'
                      : sender.vibeyUserId
                        ? '→ Personal brain'
                        : '—'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AddSlackMappingDialog({
  destinations,
  onClose,
  onSaved,
}: {
  destinations: SlackTrainingDestination[]
  onClose: () => void
  onSaved: () => void
}) {
  const [channels, setChannels] = useState<SlackTrainingChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [targetKind, setTargetKind] =
    useState<Exclude<RecurringTrainingTargetKind, 'workspace'>>('user')
  const [destinationId, setDestinationId] = useState('')
  const [cadence, setCadence] =
    useState<Extract<RecurringTrainingCadence, 'daily' | 'weekly' | 'monthly'>>('daily')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listSlackTrainingChannels()
      .then(setChannels)
      .catch((err) => toast.error(sanitizeUserError(err, 'Could not load Slack channels.')))
  }, [])

  const save = async () => {
    const channel = channels.find((item) => item.id === channelId)
    if (!channel) return
    const destination = destinations.find((item) => item.id === destinationId)
    setSaving(true)
    try {
      await saveSlackTrainingMapping({
        slack_channel_id: channel.id,
        slack_channel_name: channel.name,
        target_kind: targetKind,
        target_brain_id: targetKind === 'customer' ? null : (destination?.targetBrainId ?? null),
        target_campaign_id:
          targetKind === 'campaign' ? (destination?.targetCampaignId ?? null) : null,
        cadence,
      })
      toast.success('Slack training mapping saved.')
      onSaved()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not save Slack mapping.'))
    } finally {
      setSaving(false)
    }
  }

  const filteredDestinations = destinations.filter((item) => item.targetKind === targetKind)
  const requiresDestination = targetKind !== 'customer'

  return (
    <div className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
      <div className="z-modal-backdrop-above bg-modal-overlay fixed inset-0" onClick={onClose} />
      <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 z-modal-layer-4 w-full max-w-lg">
        <div className="space-y-spacing-2">
          <h3 className="title-h6">Add Slack mapping</h3>
          <p className="body-3 text-muted-foreground">
            Pick a channel, destination, and cadence. Nothing flows until this mapping is saved.
          </p>
        </div>

        <div className="mt-spacing-4 space-y-spacing-4">
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="input-glass body-3 w-full"
          >
            <option value="">Select channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>

          <div className="gap-spacing-2 grid grid-cols-2">
            {(['user', 'campaign', 'agent', 'customer'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setTargetKind(kind)
                  setDestinationId('')
                }}
                className={`rounded-spacing-2 border-border body-3 px-spacing-3 py-spacing-2 border text-left ${
                  targetKind === kind ? 'button-glass-primary' : 'button-glass-neutral'
                }`}
              >
                {kind === 'customer' ? 'Customer brain' : kind}
              </button>
            ))}
          </div>

          {requiresDestination ? (
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="input-glass body-3 w-full"
            >
              <option value="">Select destination</option>
              {filteredDestinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="surface-bg rounded-spacing-2 p-spacing-3">
              <p className="body-3 text-muted-foreground">
                Routes the channel to the workspace Customer Brain. Sender resolution still routes
                customer messages automatically in mixed channels.
              </p>
            </div>
          )}

          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as typeof cadence)}
            className="input-glass body-3 w-full"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="mt-spacing-6 gap-spacing-2 flex justify-end">
          <button type="button" onClick={onClose} className="button-default button-glass-neutral">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!channelId || (requiresDestination && !destinationId) || saving}
            className="button-default button-glass-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save mapping'}
          </button>
        </div>
      </div>
    </div>
  )
}
