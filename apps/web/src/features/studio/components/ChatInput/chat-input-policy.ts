import { getSystemAgentContract } from '@/lib/agents/system-agent-contracts'

export interface AgentToggle {
  integration_id: string
  provider: string
  status: string
  agent_enabled: boolean
}

export type ComposerPlusSubmenu =
  | 'agent'
  | 'space'
  | 'files'
  | 'attach'
  | 'integrations'
  | 'skills'
  | 'access'
  | null

export type ComposerCapabilityKind = 'integration' | 'channel' | 'action_domain'
export type ComposerPolicyRowState = 'default' | 'inherited' | 'allow_extra' | 'deny' | 'unset'

export interface ComposerPolicy {
  role_defaults?: Array<{ kind: ComposerCapabilityKind; id: string }>
  locked_defaults?: Array<{ kind: ComposerCapabilityKind; id: string }>
  grants: Array<{ kind: ComposerCapabilityKind; id: string }>
  overrides: {
    allow_extra: Array<{ kind: ComposerCapabilityKind; id: string }>
    deny: Array<{ kind: ComposerCapabilityKind; id: string }>
  }
  effective?: string[]
}

export interface ComposerAccessRow {
  kind: ComposerCapabilityKind
  id: string
  label: string
  description: string
}

export const COMPOSER_ACCESS_ROWS: ComposerAccessRow[] = [
  {
    kind: 'action_domain',
    id: 'read_campaign',
    label: 'Read campaign data',
    description: 'Read campaigns, campaign media, dashboards, analytics, and campaign team data.',
  },
  {
    kind: 'action_domain',
    id: 'read_marketing_artifacts',
    label: 'Read artifacts',
    description:
      'Read offers, funnels, ads, websites, presentations, sequences, avatars, and themes.',
  },
  {
    kind: 'action_domain',
    id: 'write_marketing_artifacts',
    label: 'Write artifacts',
    description:
      'Create and update offers, funnels, ads, websites, presentations, sequences, and related assets.',
  },
  {
    kind: 'action_domain',
    id: 'manage_content',
    label: 'Manage content',
    description: 'Manage social posts, blogs, emails, documents, and PDFs.',
  },
  {
    kind: 'action_domain',
    id: 'generate_media',
    label: 'Generate media',
    description:
      'Generate images and videos, analyze videos, process media, and extract transcripts.',
  },
  {
    kind: 'action_domain',
    id: 'manage_tasks_missions',
    label: 'Tasks and missions',
    description:
      'Read and update spaces, tasks, missions, comments, plans, logs, and deliverables.',
  },
  {
    kind: 'action_domain',
    id: 'communicate',
    label: 'Communicate',
    description: 'Send user messages, ask agents, delegate tasks, and manage member notes.',
  },
  {
    kind: 'action_domain',
    id: 'use_integrations',
    label: 'Use integrations',
    description: 'Master gate for connected service and Meta integration actions.',
  },
  {
    kind: 'action_domain',
    id: 'use_mcp',
    label: 'Use MCP servers',
    description: 'List and use MCP servers, tools, and resources.',
  },
]

export type ComposerPlusInfoCard = {
  title: string
  description: string
  top: number
  left: number
}

export function composerPolicyRowState(
  policy: ComposerPolicy | null,
  kind: ComposerCapabilityKind,
  id: string,
): ComposerPolicyRowState {
  if (!policy) return 'unset'
  const inherited = policy.grants.some((grant) => grant.kind === kind && grant.id === id)
  const roleDefault =
    policy.role_defaults?.some((grant) => grant.kind === kind && grant.id === id) ?? false
  const lockedDefault =
    policy.locked_defaults?.some((grant) => grant.kind === kind && grant.id === id) ?? false
  const effective = policy.effective?.includes(`${kind}:${id}`) ?? false
  const allowExtra = policy.overrides.allow_extra.some(
    (grant) => grant.kind === kind && grant.id === id,
  )
  const denied = policy.overrides.deny.some((grant) => grant.kind === kind && grant.id === id)
  if (denied) return 'deny'
  if (allowExtra) return 'allow_extra'
  if (inherited) return 'inherited'
  if (roleDefault || lockedDefault || effective) return 'default'
  if (kind === 'action_domain' && id === 'write_user_memory') return 'default'
  return 'unset'
}

export function composerPolicyRowLocked(
  policy: ComposerPolicy | null,
  kind: ComposerCapabilityKind,
  id: string,
): boolean {
  if (!policy) return false
  return policy.locked_defaults?.some((grant) => grant.kind === kind && grant.id === id) ?? false
}

export function applyComposerSystemAccessPolicy(
  policy: ComposerPolicy,
  agentKey: string,
): ComposerPolicy {
  const contract = getSystemAgentContract(agentKey)
  if (!contract) return policy
  const defaults = COMPOSER_ACCESS_ROWS.filter(
    (row) => row.kind === 'action_domain' && contract.platformDomains.includes(row.id),
  ).map(({ kind, id }) => ({ kind, id }))
  if (defaults.length === 0) return policy
  return {
    ...policy,
    role_defaults: mergeComposerCapabilities(policy.role_defaults ?? [], defaults),
    locked_defaults: mergeComposerCapabilities(policy.locked_defaults ?? [], defaults),
  }
}

export function applyComposerPolicyOverride(
  policy: ComposerPolicy,
  kind: ComposerCapabilityKind,
  id: string,
  target: ComposerPolicyRowState,
): ComposerPolicy {
  const allow_extra = policy.overrides.allow_extra.filter(
    (grant) => !(grant.kind === kind && grant.id === id),
  )
  const deny = policy.overrides.deny.filter((grant) => !(grant.kind === kind && grant.id === id))
  if (target === 'allow_extra') allow_extra.push({ kind, id })
  if (target === 'deny') deny.push({ kind, id })
  return { ...policy, overrides: { allow_extra, deny } }
}

export function composerPolicyOverridesPayload(
  policy: ComposerPolicy,
): Array<{ kind: ComposerCapabilityKind; id: string; mode: 'allow_extra' | 'deny' }> {
  return [
    ...policy.overrides.allow_extra.map((grant) => ({ ...grant, mode: 'allow_extra' as const })),
    ...policy.overrides.deny.map((grant) => ({ ...grant, mode: 'deny' as const })),
  ]
}

function mergeComposerCapabilities(
  base: Array<{ kind: ComposerCapabilityKind; id: string }>,
  additions: Array<{ kind: ComposerCapabilityKind; id: string }>,
): Array<{ kind: ComposerCapabilityKind; id: string }> {
  const seen = new Set(base.map((grant) => `${grant.kind}:${grant.id}`))
  const merged = [...base]
  for (const grant of additions) {
    const key = `${grant.kind}:${grant.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(grant)
  }
  return merged
}
