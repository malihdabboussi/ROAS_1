const PUBLIC_AGENT_META_PROMPTS = [
  'how do you work',
  'what can you do',
  'what do you do',
  'what can you help',
  'how can you help',
  'who are you',
] as const

export function buildPublicAgentQuickContext(
  source: string | undefined,
  content: string,
  agentReg: Record<string, unknown> | null,
  resolvedAgentId: string,
): string {
  if (source !== 'public_agent') return ''
  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/[!?.,]+$/g, '')
  if (!normalized || normalized.length > 180) return ''
  const isGreeting = /^(hi|hello|hey|yo|sup|gm|good morning|good afternoon|good evening)$/.test(
    normalized,
  )
  if (!isGreeting && !PUBLIC_AGENT_META_PROMPTS.some((prompt) => normalized.includes(prompt))) {
    return ''
  }

  const config = (agentReg?.config as Record<string, unknown> | null) ?? {}
  const capabilityDomain =
    typeof config.capability_domain === 'string' ? config.capability_domain : ''
  return [
    'PUBLIC AGENT FAST CONTEXT:',
    `- Agent key: ${resolvedAgentId}`,
    capabilityDomain ? `- Capability domain: ${capabilityDomain}` : '',
    '- For greetings or meta questions, briefly explain how this agent helps and invite a specific question.',
  ]
    .filter(Boolean)
    .join('\n')
}
