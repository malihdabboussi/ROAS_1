'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { channelsService, type ChannelMessage } from '@/lib/channels'
import { getChannelMessageOrbState } from './channel-message-bubble-utils'

const STALE_THRESHOLD_MS = 600_000

function ChannelAgentStatusBadge({
  agentKey,
  status,
  phase,
  lastActivity,
  invokedAt,
  channelId,
  messageId,
}: {
  agentKey: string
  status: string
  phase: string | null
  lastActivity: string | null
  invokedAt: string | null
  channelId: string
  messageId: string
}) {
  const [stale, setStale] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const isActive = status === 'acknowledged' || status === 'processing'

  useEffect(() => {
    if (!isActive) {
      setStale(false)
      return
    }
    const check = () => {
      const ref = lastActivity ?? invokedAt
      if (!ref) return
      const elapsed = Date.now() - new Date(ref).getTime()
      setStale(elapsed > STALE_THRESHOLD_MS)
    }
    check()
    const id = setInterval(check, 5_000)
    return () => clearInterval(id)
  }, [isActive, lastActivity, invokedAt])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await channelsService.retryAgentInvocation(channelId, messageId, agentKey)
      setStale(false)
    } catch {
      toast.error('Could not retry agent.')
    } finally {
      setRetrying(false)
    }
  }

  if (isActive && stale) {
    return (
      <span className="badge-glass badge-glass-red gap-1">
        <AlertCircle className="h-3 w-3" />
        <span className="font-medium">{agentKey}</span>
        <span>timed out</span>
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="typo-caption text-destructive hover:bg-hover-subtle ml-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${retrying ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </span>
    )
  }

  if (isActive) {
    const phaseLabel = phase ?? (status === 'acknowledged' ? 'starting' : 'working')
    const orbState = getChannelMessageOrbState(status, phase)
    return (
      <span className="badge-glass badge-glass-orange gap-1.5">
        <Eye className="h-3 w-3" />
        <span className="font-medium">{agentKey}</span>
        <span>{phaseLabel}...</span>
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-visible">
          <VibeyChatOrb state={orbState} style="elastic" />
        </span>
      </span>
    )
  }

  if (status === 'completed') {
    return (
      <span className="badge-glass badge-glass-green gap-1">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-medium">{agentKey}</span>
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="badge-glass badge-glass-red gap-1">
        <AlertCircle className="h-3 w-3" />
        <span className="font-medium">{agentKey}</span>
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="typo-caption text-destructive hover:bg-hover-subtle ml-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${retrying ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </span>
    )
  }

  return null
}

export function ChannelAgentStatusBadges({
  metadata,
  channelId,
  messageId,
  hideActive = false,
}: {
  metadata: ChannelMessage['metadata']
  channelId: string
  messageId: string
  hideActive?: boolean
}) {
  const agentStatus = metadata?.agent_status as Record<string, string> | undefined
  const agentPhases = (metadata?.agent_phases as Record<string, string>) ?? null
  const agentLastActivities = (metadata?.agent_last_activities as Record<string, string>) ?? null
  const legacyPhase = (metadata?.agent_phase as string) ?? null
  const legacyLastActivity = (metadata?.agent_last_activity as string) ?? null
  const agentInvokedAt = (metadata?.agent_invoked_at as string) ?? null

  if (!agentStatus || Object.keys(agentStatus).length === 0) return null

  const entries = Object.entries(agentStatus).filter(([, status]) => {
    if (!hideActive) return true
    return status !== 'acknowledged' && status !== 'processing'
  })

  if (entries.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {entries.map(([agentKey, status]) => (
        <ChannelAgentStatusBadge
          key={agentKey}
          agentKey={agentKey}
          status={status}
          phase={agentPhases?.[agentKey] ?? legacyPhase}
          lastActivity={agentLastActivities?.[agentKey] ?? legacyLastActivity}
          invokedAt={agentInvokedAt}
          channelId={channelId}
          messageId={messageId}
        />
      ))}
    </div>
  )
}
