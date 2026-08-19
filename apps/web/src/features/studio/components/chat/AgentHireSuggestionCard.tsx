'use client'

import { memo, useState } from 'react'
import { AlertCircle, Check, Loader2, UserPlus, X } from 'lucide-react'
import { backendPost } from '@/lib/api/backend-client'

export interface AgentHireSuggestion {
  role_key: string
  default_name: string
  role_title: string
  reason?: string
}

export interface AgentHireSuggestionCardProps {
  delegationId?: string
  campaignId: string
  suggestions: AgentHireSuggestion[]
  originalAction: 'ask_agent' | 'delegate_to_agent'
  originalPrompt: string
  status: 'pending' | 'approved' | 'rejected'
  onApprove?: (roleKey: string, campaignId: string) => void
  onReject?: () => void
}

export const AgentHireSuggestionCard = memo(function AgentHireSuggestionCard(
  props: AgentHireSuggestionCardProps,
) {
  const { suggestions, status, onApprove, onReject, campaignId } = props
  const [localStatus, setLocalStatus] = useState(status)
  const [hiring, setHiring] = useState(false)
  const [hiredName, setHiredName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (roleKey: string, defaultName: string) => {
    setHiring(true)
    setLocalStatus('approved')
    setError(null)
    onApprove?.(roleKey, campaignId)

    try {
      const hireResult = await backendPost<{
        agent_key?: string
        name?: string
        data?: { agent_key?: string; name?: string }
        error?: string
      }>('/api/agents/hire-ready', { role_key: roleKey })

      const hiredAgentKey = hireResult.agent_key ?? hireResult.data?.agent_key
      const hiredAgentName = hireResult.name ?? hireResult.data?.name ?? defaultName

      if (!hiredAgentKey) {
        setError('Hire succeeded but no agent key returned')
        setHiring(false)
        return
      }

      if (campaignId) {
        await backendPost<{ success: boolean; error?: string }>(
          `/api/campaigns/${campaignId}/agents`,
          { agent_key: hiredAgentKey },
        )
      }

      setHiredName(hiredAgentName)
      setHiring(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hire agent')
      setHiring(false)
    }
  }

  const handleReject = () => {
    setLocalStatus('rejected')
    onReject?.()
  }

  const displayStatus = localStatus

  if (displayStatus === 'approved') {
    return (
      <div className="surface-card border-border rounded-spacing-2 px-spacing-3 py-spacing-2 mt-spacing-2 border border-green-500/20 bg-green-500/5">
        <div className="gap-spacing-2 flex items-center">
          {hiring ? (
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
          ) : error ? (
            <AlertCircle className="text-destructive h-4 w-4" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
          <span className="text-foreground text-sm">
            {hiring
              ? 'Hiring and assigning to campaign...'
              : error
                ? error
                : `${hiredName ?? 'Agent'} hired and assigned to campaign`}
          </span>
        </div>
      </div>
    )
  }

  if (displayStatus === 'rejected') {
    return (
      <div className="surface-card border-border rounded-spacing-2 px-spacing-3 py-spacing-2 mt-spacing-2 border opacity-60">
        <div className="gap-spacing-2 flex items-center">
          <X className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-sm">Hire suggestion skipped</span>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 mt-spacing-2 overflow-hidden border border-amber-500/20 bg-amber-500/5">
      <div className="px-spacing-3 py-spacing-2 border-b border-amber-500/20">
        <div className="gap-spacing-2 flex items-center">
          <UserPlus className="h-4 w-4 text-amber-500" />
          <span className="text-foreground text-sm font-medium">Team member needed</span>
        </div>
      </div>

      <div className="px-spacing-3 py-spacing-2 space-y-spacing-2">
        {suggestions.map((s) => (
          <div key={s.role_key} className="gap-spacing-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium">{s.default_name}</div>
              <div className="text-muted-foreground text-xs">{s.role_title}</div>
              {s.reason && (
                <div className="text-muted-foreground mt-0.5 text-xs italic">{s.reason}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleApprove(s.role_key, s.default_name)}
              className="rounded-spacing-2 bg-primary text-primary-foreground px-spacing-3 py-spacing-1 flex-shrink-0 text-xs font-medium transition-colors hover:opacity-90"
            >
              Hire & Assign
            </button>
          </div>
        ))}
      </div>

      <div className="border-border px-spacing-3 py-spacing-2 flex justify-end border-t">
        <button
          type="button"
          onClick={handleReject}
          className="text-muted-foreground text-xs transition-colors hover:text-white"
        >
          Skip
        </button>
      </div>
    </div>
  )
})
