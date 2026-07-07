'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchYoutubeChannels,
  saveYoutubeChannel,
  type YoutubeAuthenticatedChannel,
} from '@/features/settings/services/youtube-channels-api'
import type { UserIntegration } from './integrations.types'

export function YoutubeChannelPickerModal({
  userIntegration,
  open,
  onClose,
  onSaved,
}: {
  userIntegration: UserIntegration
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [channels, setChannels] = useState<YoutubeAuthenticatedChannel[]>([])

  const loadChannels = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetchYoutubeChannels(userIntegration.id)
      if (!res.success) {
        setError(res.error ?? 'Failed to load YouTube channels')
        setChannels([])
        return
      }
      setChannels(res.channels)
      if (res.hint) setHint(res.hint)
      if (res.channels.length === 1) {
        const only = res.channels[0]!
        setSaving(true)
        const saved = await saveYoutubeChannel({
          user_integration_id: userIntegration.id,
          channel_id: only.id,
          channel_name: only.name,
        })
        setSaving(false)
        if (!saved.success) {
          setError(saved.error ?? 'Failed to save YouTube channel')
          return
        }
        onSaved()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load YouTube channels')
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [userIntegration.id, onClose, onSaved])

  useEffect(() => {
    if (!open) return
    void loadChannels()
  }, [open, loadChannels])

  const handleSelect = async (channel: YoutubeAuthenticatedChannel) => {
    setSaving(true)
    setError(null)
    try {
      const res = await saveYoutubeChannel({
        user_integration_id: userIntegration.id,
        channel_id: channel.id,
        channel_name: channel.name,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to save YouTube channel')
        return
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save YouTube channel')
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-modal-overlay"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="surface-card border-border relative z-[1] w-full max-w-md rounded-xl border p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="body-2 text-foreground font-semibold">Select YouTube channel</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="body-3 text-muted-foreground mb-3">
          Social reporting uses YouTube Analytics for the channel tied to this Google account.
        </p>
        {loading || saving ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <VibeyLoadingOrb size="sm" text={saving ? 'Saving...' : 'Loading channels...'} />
          </div>
        ) : error ? (
          <p className="body-3 text-destructive">{error}</p>
        ) : channels.length === 0 ? (
          <p className="body-3 text-muted-foreground">
            {hint ?? 'No YouTube channels found for this account.'}
          </p>
        ) : (
          <div className="max-h-[280px] space-y-1 overflow-y-auto">
            {channels.map((channel) => {
              const selected = userIntegration.metadata?.youtube_channel_id === channel.id
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => void handleSelect(channel)}
                  className="body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left"
                >
                  <span className="text-foreground min-w-0 truncate">
                    {channel.name}
                    {channel.handle ? ` (${channel.handle})` : ''}
                  </span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
