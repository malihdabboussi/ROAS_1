'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchYoutubeChannels,
  saveYoutubeChannel,
  type YoutubeAuthenticatedChannel,
} from '@/lib/integrations/social-reporting-pages-api'
import type { SocialConnectionOption } from '@/lib/reporting/social-analytics-types'
import { resolveSocialReportingUserIntegrationId } from './resolve-social-reporting-user-integration-id'

type YoutubeReportingChannelPickerProps = {
  selectedChannelName: string | null
  platformOpts: SocialConnectionOption[]
  effectiveConnectionId: string | null
  activeConnectionId?: string | null
  activeConnectionSource?: 'campaign_integration' | 'user_integration' | null
  onConnectionChange?: (connectionId: string | null) => void
  onChannelSaved: () => void
}

export function YoutubeReportingChannelPicker({
  selectedChannelName,
  platformOpts,
  effectiveConnectionId,
  activeConnectionId,
  activeConnectionSource,
  onConnectionChange,
  onChannelSaved,
}: YoutubeReportingChannelPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [channels, setChannels] = useState<YoutubeAuthenticatedChannel[]>([])
  const [loadedForId, setLoadedForId] = useState<string | null>(null)

  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number | null; bottom: number | null; left: number }>({
    top: 0,
    bottom: null,
    left: 0,
  })

  const userIntegrationId = resolveSocialReportingUserIntegrationId(
    effectiveConnectionId,
    platformOpts,
    activeConnectionId,
    activeConnectionSource,
  )

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const dropdownHeight = menuRef.current?.offsetHeight ?? 320
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = rect.bottom > window.innerHeight * 0.55 || spaceBelow < dropdownHeight + 12
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 248))
    if (placeAbove) {
      setPos({ top: null, bottom: window.innerHeight - rect.top + 4, left })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open, loading, saving, channels.length, error])

  const loadChannels = useCallback(async () => {
    if (!userIntegrationId) {
      setError('No YouTube connection found for this campaign.')
      setChannels([])
      return
    }
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetchYoutubeChannels(userIntegrationId)
      if (!res.success) {
        setError(res.error ?? 'Failed to load channels')
        setChannels([])
        return
      }
      setChannels(res.channels)
      if (res.hint) setHint(res.hint)
      setLoadedForId(userIntegrationId)

      if (res.channels.length === 1 && !selectedChannelName) {
        const only = res.channels[0]!
        setSaving(true)
        const saved = await saveYoutubeChannel({
          user_integration_id: userIntegrationId,
          channel_id: only.id,
          channel_name: only.name,
        })
        setSaving(false)
        if (!saved.success) {
          setError(saved.error ?? 'Failed to save channel')
          return
        }
        setOpen(false)
        onChannelSaved()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load channels')
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [userIntegrationId, selectedChannelName, onChannelSaved])

  useEffect(() => {
    if (!open) return
    if (loadedForId === userIntegrationId && channels.length > 0) return
    void loadChannels()
  }, [open, loadChannels, loadedForId, userIntegrationId, channels.length])

  const handleSelectChannel = async (channel: YoutubeAuthenticatedChannel) => {
    if (!userIntegrationId) return
    setSaving(true)
    setError(null)
    try {
      const res = await saveYoutubeChannel({
        user_integration_id: userIntegrationId,
        channel_id: channel.id,
        channel_name: channel.name,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to save channel')
        return
      }
      setOpen(false)
      onChannelSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save channel')
    } finally {
      setSaving(false)
    }
  }

  const menuLabel = selectedChannelName?.trim() || 'Select channel'
  const showConnectionSection = onConnectionChange != null && platformOpts.length > 0

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border body-3 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors"
      >
        Channel: {menuLabel}
        <ChevronDown className="icon-xs" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50"
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
            }}
            data-social-account-dropdown
          >
            <div className="surface-card border-border rounded-spacing-2 p-spacing-2 max-h-[320px] min-w-[240px] overflow-auto border shadow-lg">
              {showConnectionSection ? (
                <>
                  <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-1">
                    Connection
                  </p>
                  <button
                    type="button"
                    onClick={() => onConnectionChange(null)}
                    className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full text-left transition-colors ${
                      !effectiveConnectionId
                        ? 'bg-primary/10 text-muted-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Auto (default)
                  </button>
                  {platformOpts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onConnectionChange(opt.id)
                        setLoadedForId(null)
                        setChannels([])
                      }}
                      className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full truncate text-left transition-colors ${
                        effectiveConnectionId === opt.id
                          ? 'bg-primary/10 text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                      {opt.is_default ? ' · default' : ''}
                    </button>
                  ))}
                  <div className="border-border my-spacing-1 border-t" />
                </>
              ) : null}

              <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1">
                Channel
              </p>

              {loading || saving ? (
                <div className="flex min-h-[80px] items-center justify-center py-4">
                  <VibeyLoadingOrb size="sm" text={saving ? 'Saving...' : 'Loading channels...'} />
                </div>
              ) : error ? (
                <p className="body-3 text-destructive px-spacing-2 py-spacing-2">{error}</p>
              ) : !userIntegrationId ? (
                <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                  Connect YouTube in Settings first.
                </p>
              ) : channels.length === 0 ? (
                <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                  {hint ?? 'No channels found.'}
                </p>
              ) : (
                channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => void handleSelectChannel(channel)}
                    className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full truncate text-left transition-colors ${
                      selectedChannelName === channel.name
                        ? 'bg-primary/10 text-muted-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {channel.name}
                    {channel.handle ? ` (${channel.handle})` : ''}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
