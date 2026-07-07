import type { ResolvedAgentPolicy } from './agent-policy.types'

interface BuildAgentAccessSummaryInput {
  agentKey: string
  hasUserBrain: boolean
  hasCampaignContext: boolean
  hasOwnAgentBrain: boolean
  deniedBrainActions?: Iterable<string>
  deniedCampaignActions?: Iterable<string>
}

interface BuildDisabledNativeActionsInput {
  hasUserBrain: boolean
  hasCampaignContext: boolean
  personalBrainActions: Iterable<string>
  campaignContextActions: Iterable<string>
  policyDeniedActions?: Iterable<string>
}

function formatActionList(actions: Iterable<string> | undefined): string {
  return Array.from(actions ?? [])
    .map((action) => action.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(', ')
}

export function buildAgentAccessSummary(input: BuildAgentAccessSummaryInput): string {
  const allowed: string[] = []
  const denied: string[] = []

  if (input.hasOwnAgentBrain) {
    allowed.push(
      '- Your own agent brain: perspectives, beliefs, SK entries, snapshots, and Cortex spotlight. Use this first.',
    )
  }
  if (input.hasUserBrain) {
    allowed.push("- The user's personal brain.")
  } else {
    const actions = formatActionList(input.deniedBrainActions)
    denied.push(
      actions
        ? `- The user's personal brain. Do NOT call: ${actions}.`
        : "- The user's personal brain.",
    )
  }
  if (input.hasCampaignContext) {
    allowed.push("- The active campaign's context, knowledge, media, and dashboards.")
  } else {
    const actions = formatActionList(input.deniedCampaignActions)
    denied.push(actions ? `- Campaign context. Do NOT call: ${actions}.` : '- Campaign context.')
  }

  if (!allowed.length) {
    allowed.push('- Nothing outside the conversation and task context provided in this turn.')
  }
  if (!denied.length) {
    denied.push('- No additional policy-denied context for this turn.')
  }

  return [
    `ACCESS POLICY for ${input.agentKey}:`,
    'You CAN read:',
    ...allowed,
    'You CANNOT read:',
    ...denied,
    'If you need something you cannot read, ask the user or delegate to a teammate who has it. Do not attempt denied tools.',
  ].join('\n')
}

export function buildDisabledNativeActions(input: BuildDisabledNativeActionsInput): string[] {
  return Array.from(
    new Set([
      ...(input.policyDeniedActions ? Array.from(input.policyDeniedActions) : []),
      ...(!input.hasUserBrain ? Array.from(input.personalBrainActions) : []),
      ...(!input.hasCampaignContext ? Array.from(input.campaignContextActions) : []),
    ]),
  )
}

export function buildEnabledToolkits(
  resolvedPolicy: ResolvedAgentPolicy | null | undefined,
): string[] | undefined {
  if (!resolvedPolicy) return undefined

  const ids = new Set<string>()
  for (const grant of resolvedPolicy.grants) {
    if (grant.kind === 'integration') ids.add(grant.id)
  }
  for (const allow of resolvedPolicy.overrides.allow_extra) {
    if (allow.kind === 'integration') ids.add(allow.id)
  }
  for (const deny of resolvedPolicy.overrides.deny) {
    if (deny.kind === 'integration') ids.delete(deny.id)
  }

  return Array.from(ids)
}
