import type { BrainLiveScope } from '@/features/brain/hooks/use-brain-live-session'

export type BrainScopeToolbarAction = 'train' | 'crystallize' | 'cortex-max' | 'voice' | 'add-info'

export type BrainScopeLiveInput = {
  scopeType: BrainLiveScope['type'] | 'shared'
  id: string
  agentId: string | null
  campaignId?: string
  brainId: string | null
  label: string
}

/** Maps a sidebar / page brain scope to the Atlas live-session payload. */
export function brainScopeToLiveScope(input: BrainScopeLiveInput): BrainLiveScope | undefined {
  if (input.scopeType !== 'user' && input.scopeType !== 'shared' && !input.brainId) return undefined
  const type = input.scopeType === 'shared' ? 'user' : input.scopeType
  return {
    type,
    agentId: input.agentId,
    campaignId: input.campaignId ?? null,
    brainId: input.brainId,
    label: input.label,
  }
}

export function brainScopeHref(scopeId: string, action?: BrainScopeToolbarAction): string {
  const params = new URLSearchParams()
  params.set('scope', scopeId)
  if (action) params.set('action', action)
  return `/brain?${params.toString()}`
}

/** Brain Home (fleet view) — no scope param. */
export function brainHomeHref(): string {
  return '/brain'
}

export function brainScopeAbsoluteUrl(scopeId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${brainScopeHref(scopeId)}`
}
