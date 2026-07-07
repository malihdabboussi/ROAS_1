'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  getAgentPolicy,
  setAgentOverrides,
  type AgentCapabilityKind,
} from '@/lib/agents'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { MessageContentBlock } from '../../types'

type InlineAgentAccessRequestBlock = Extract<MessageContentBlock, { type: 'agent_access_request' }>

export function InlineAgentAccessRequest({
  block,
  onResolved,
}: {
  block: InlineAgentAccessRequestBlock
  onResolved: (next: InlineAgentAccessRequestBlock) => void
}) {
  const [saving, setSaving] = useState(false)
  const status = block.status ?? 'pending'
  const agentName = block.agent_name ?? block.agent_key

  const approve = async () => {
    if (saving || status !== 'pending') return
    setSaving(true)
    try {
      const policy = await getAgentPolicy(block.agent_key)
      const nextOverrides = [
        ...policy.overrides.allow_extra.map((item) => ({
          kind: item.kind,
          id: item.id,
          mode: 'allow_extra' as const,
        })),
        ...policy.overrides.deny.map((item) => ({
          kind: item.kind,
          id: item.id,
          mode: 'deny' as const,
        })),
      ]
      const alreadyAllowed = nextOverrides.some(
        (item) =>
          item.mode === 'allow_extra' &&
          item.kind === block.missing_capability.kind &&
          item.id === block.missing_capability.id,
      )
      if (!alreadyAllowed) {
        nextOverrides.push({
          kind: block.missing_capability.kind as AgentCapabilityKind,
          id: block.missing_capability.id,
          mode: 'allow_extra',
        })
      }
      await setAgentOverrides(block.agent_key, nextOverrides)
      onResolved({ ...block, status: 'approved', error: undefined })
      toast.success('Access enabled')
    } catch (err) {
      const message = sanitizeUserError(err, 'Failed to enable access')
      onResolved({ ...block, status: 'failed', error: message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    if (saving || status !== 'pending') return
    onResolved({ ...block, status: 'cancelled' })
  }

  return (
    <div className="surface-card border-border rounded-xl border p-4">
      <div className="space-y-1">
        <p className="body-3 text-foreground font-medium">
          Give {agentName} access to {block.required_action.replace(/_/g, ' ')}?
        </p>
        <p className="body-4 text-muted-foreground">{block.reason}</p>
        <p className="body-4 text-muted-foreground">
          This enables `{block.missing_capability.id}` for {agentName}.
        </p>
      </div>

      {status === 'approved' ? (
        <p className="body-4 mt-3 text-green-400">Access enabled. Ask again or continue now.</p>
      ) : status === 'cancelled' ? (
        <p className="body-4 text-muted-foreground mt-3">Access request cancelled.</p>
      ) : status === 'failed' ? (
        <p className="body-4 mt-3 text-red-400">{block.error ?? 'Failed to enable access.'}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void approve()}
            className="button-primary button-small"
          >
            {saving ? 'Allowing…' : 'Allow access'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={cancel}
            className="button-ghost button-small"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
