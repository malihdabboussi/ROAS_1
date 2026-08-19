'use client'

import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import {
  getSlackInstallUrl,
  listSlackWorkspaceChannels,
  mapSlackChannel,
  type SlackWorkspaceChannel,
} from '../services/channels.service'

interface SlackSetupDialogProps {
  agentKey: string
  agentName: string
  onClose: () => void
  onConnected: (channelName: string) => void
}

export function SlackSetupDialog({
  agentKey,
  agentName,
  onClose,
  onConnected,
}: SlackSetupDialogProps) {
  const [connecting, setConnecting] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channels, setChannels] = useState<SlackWorkspaceChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [mapping, setMapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true)
    setError(null)
    try {
      const rows = await listSlackWorkspaceChannels()
      setChannels(rows)
      if (rows[0] && !selectedChannelId) setSelectedChannelId(rows[0].id)
      setConnected(true)
    } catch (err) {
      setConnected(false)
      setError(err instanceof Error ? err.message : 'Failed to load Slack channels')
    } finally {
      setLoadingChannels(false)
    }
  }, [selectedChannelId])

  const handleConnectSlack = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const { url } = await getSlackInstallUrl(agentKey)
      const popup = window.open(url, 'vibey-slack-oauth', 'width=700,height=820')
      if (!popup) throw new Error('Unable to open Slack OAuth window')

      await new Promise<void>((resolve, reject) => {
        const startedAt = Date.now()
        const timer = window.setInterval(() => {
          const elapsed = Date.now() - startedAt
          if (popup.closed) {
            window.clearInterval(timer)
            resolve()
          } else if (elapsed > 5 * 60 * 1000) {
            window.clearInterval(timer)
            popup.close()
            reject(new Error('Slack OAuth timed out'))
          }
        }, 700)
      })

      await loadChannels()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Slack')
    } finally {
      setConnecting(false)
    }
  }, [agentKey, loadChannels])

  const handleMapChannel = useCallback(async () => {
    if (!selectedChannelId) return
    const selected = channels.find((channel) => channel.id === selectedChannelId)
    if (!selected) return
    setMapping(true)
    setError(null)
    try {
      await mapSlackChannel(agentKey, selected.id, selected.name)
      onConnected(selected.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to map Slack channel')
    } finally {
      setMapping(false)
    }
  }, [agentKey, channels, onConnected, selectedChannelId])

  return (
    <div className="bg-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="surface-card border-subtle rounded-spacing-3 p-spacing-5 relative w-full max-w-md border">
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare btn-close-absolute"
          aria-label="Close"
        >
          <X className="icon-sm" />
        </button>

        <div className="mb-spacing-4">
          <h3 className="text-foreground text-base font-semibold uppercase">CONNECT SLACK</h3>
        </div>

        <div className="space-y-spacing-3">
          <p className="body-3 text-muted-foreground">
            Connect Slack to <span className="text-foreground font-medium">{agentName}</span> and
            map a channel where this agent will respond.
          </p>

          {!connected && (
            <button
              type="button"
              onClick={() => void handleConnectSlack()}
              disabled={connecting}
              className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 w-full text-center"
            >
              {connecting ? 'Connecting Slack...' : 'Connect Slack Workspace'}
            </button>
          )}

          {connected && (
            <div className="space-y-spacing-3">
              <p className="body-4 text-muted-foreground/70 uppercase tracking-wide">
                Choose Channel
              </p>
              {loadingChannels ? (
                <p className="body-4 text-muted-foreground">Loading channels...</p>
              ) : channels.length === 0 ? (
                <p className="body-4 text-muted-foreground">
                  No channels found. Add this app to at least one channel first.
                </p>
              ) : (
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="input-glass body-4 px-spacing-3 py-spacing-2 w-full"
                >
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => void handleMapChannel()}
                disabled={mapping || !selectedChannelId}
                className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 w-full text-center"
              >
                {mapping ? 'Mapping channel...' : 'Connect Channel'}
              </button>
            </div>
          )}

          {error && <p className="body-4 text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}
