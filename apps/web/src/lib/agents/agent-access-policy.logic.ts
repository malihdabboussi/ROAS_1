import {
  CHANNEL_VALUES,
  type AgentCapabilityKind,
  type ResolvedAgentPolicyJson,
} from '@/lib/agents/agent-teams.types'

export type RowState = 'default' | 'inherited' | 'allow_extra' | 'deny' | 'unset'

export interface CapabilityRow {
  kind: AgentCapabilityKind
  id: string
  label: string
  description: string
}

const CHANNEL_DESCRIPTIONS: Record<(typeof CHANNEL_VALUES)[number], string> = {
  slack: 'Receives messages addressed to this agent in Slack.',
  telegram: 'Receives messages addressed to this agent in Telegram.',
}

export const ACTION_DOMAIN_ROWS: CapabilityRow[] = [
  {
    kind: 'action_domain',
    id: 'read_campaign',
    label: 'Read campaign data',
    description: 'Read campaigns, campaign media, dashboards, analytics, and campaign team data.',
  },
  {
    kind: 'action_domain',
    id: 'read_marketing_artifacts',
    label: 'Read marketing artifacts',
    description:
      'Read offers, funnels, ads, websites, presentations, sequences, avatars, and themes.',
  },
  {
    kind: 'action_domain',
    id: 'read_brain_personal',
    label: 'Read personal brain',
    description: 'Read from the user personal brain.',
  },
  {
    kind: 'action_domain',
    id: 'read_space_context',
    label: 'Search Space Knowledge',
    description:
      'Search semantic Space Knowledge before reading exact documents, tasks, or missions.',
  },
  {
    kind: 'action_domain',
    id: 'write_user_memory',
    label: 'Save user memory',
    description: 'Save regular user memories, facts, preferences, decisions, and durable context.',
  },
  {
    kind: 'action_domain',
    id: 'write_marketing_artifacts',
    label: 'Write marketing artifacts',
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
    label: 'Manage tasks and missions',
    description:
      'Read and update spaces, tasks, missions, comments, plans, logs, and deliverables.',
  },
  {
    kind: 'action_domain',
    id: 'manage_agents',
    label: 'Delete agent skills',
    description:
      'Allow deleting agent skills and skill resources. Every agent can always create and update its own skills; only HR can create or update agent identity.',
  },
  {
    kind: 'action_domain',
    id: 'communicate',
    label: 'Communicate and delegate',
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

export const ACCESS_POLICY_SECTIONS: Array<{
  kind: AgentCapabilityKind
  title: string
  options: CapabilityRow[]
}> = [
  {
    kind: 'action_domain',
    title: 'Action domains',
    options: ACTION_DOMAIN_ROWS,
  },
  {
    kind: 'channel',
    title: 'Channels',
    options: CHANNEL_VALUES.map((c) => ({
      kind: 'channel',
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      description: CHANNEL_DESCRIPTIONS[c],
    })),
  },
]

export function policyRowState(
  policy: ResolvedAgentPolicyJson | null,
  kind: AgentCapabilityKind,
  id: string,
): RowState {
  if (!policy) return 'unset'
  const inheritedFromTeam = policy.grants.some((g) => g.kind === kind && g.id === id)
  const roleDefault = policy.role_defaults?.some((g) => g.kind === kind && g.id === id) ?? false
  const allowExtra = policy.overrides.allow_extra.some((g) => g.kind === kind && g.id === id)
  const denied = policy.overrides.deny.some((g) => g.kind === kind && g.id === id)
  if (denied) return 'deny'
  if (allowExtra) return 'allow_extra'
  if (inheritedFromTeam) return 'inherited'
  if (roleDefault) return 'default'
  if (kind === 'action_domain' && id === 'write_user_memory') return 'default'
  return 'unset'
}

export function buildPolicyOverridesPayload(
  policy: ResolvedAgentPolicyJson | null,
  changes: Map<string, RowState>,
): Array<{ kind: AgentCapabilityKind; id: string; mode: 'allow_extra' | 'deny' }> {
  if (!policy) return []
  const result: Array<{ kind: AgentCapabilityKind; id: string; mode: 'allow_extra' | 'deny' }> = []
  for (const o of policy.overrides.allow_extra) {
    const k = `${o.kind}:${o.id}`
    const ch = changes.get(k)
    if (ch === undefined) result.push({ kind: o.kind, id: o.id, mode: 'allow_extra' })
  }
  for (const o of policy.overrides.deny) {
    const k = `${o.kind}:${o.id}`
    const ch = changes.get(k)
    if (ch === undefined) result.push({ kind: o.kind, id: o.id, mode: 'deny' })
  }
  for (const [k, state] of changes) {
    const [kind, ...rest] = k.split(':')
    const id = rest.join(':')
    if (state === 'allow_extra' || state === 'deny') {
      result.push({ kind: kind as AgentCapabilityKind, id, mode: state })
    }
  }
  return result
}
