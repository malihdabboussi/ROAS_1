import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import {
  createNewConversation,
  fetchMessages,
  sendConversationMessageStreaming,
} from '@/lib/conversations/conversations-api'
import type { HrInsightsData } from './ready-employees-modal.types'

export async function fetchHrInsightsViaLlm(params: {
  hrAgentId: string
  agents: MissionAgent[]
  potentialProfiles: ReadyEmployeeProfile[]
}): Promise<HrInsightsData> {
  const { hrAgentId, agents, potentialProfiles } = params
  const conv = await createNewConversation({
    title: 'HR Insights',
    agent_id: hrAgentId,
  })
  const teamAgents = agents.filter((a) => a.level !== 'system')
  const currentTeamLines =
    teamAgents.length > 0
      ? teamAgents.map((a) => `- ${a.agent_key}: ${a.name} (${a.role})`).join('\n')
      : '(none)'
  const availableLines =
    potentialProfiles.length > 0
      ? potentialProfiles.map((p) => `- ${p.role_key}: ${p.default_name} (${p.role})`).join('\n')
      : '(none)'

  const parts: string[] = [
    'You are reviewing the team as an HR strategist. Analyze and give structured insights.',
    '',
    '**Current team:**',
    currentTeamLines,
    '',
    '**Available to hire:**',
    availableLines,
    '',
    'Respond ONLY with a valid JSON object — no markdown, no explanation, no text outside the JSON.',
    'Use this exact schema:',
    '{',
    '  "team_gaps": [',
    '    { "gap": "short gap name", "severity": "critical|high|medium", "evidence": "one sentence why" }',
    '  ],',
    '  "team_structure": {',
    '    "summary": "2-3 sentence overall assessment",',
    '    "strengths": ["strength 1", "strength 2"],',
    '    "improvements": ["improvement 1", "improvement 2"]',
    '  },',
    '  "cascade_hires": [',
    '    { "agent_key": "role_key_from_available_list", "reason": "one sentence why" },',
    '    { "agent_key": "...", "reason": "..." },',
    '    { "agent_key": "...", "reason": "..." }',
    '  ]',
    '}',
  ]
  await sendConversationMessageStreaming({
    conversation_id: conv.id,
    content: parts.join('\n'),
  })
  const messages = await fetchMessages(conv.id, { limit: 20 })
  const latestAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && (m.content ?? '').trim().length > 0)
  const content = latestAssistant?.content?.trim() ?? ''
  const normalized = content.toLowerCase()
  const isOverloaded =
    normalized.includes('temporarily overloaded') || normalized.includes('try again in a moment')
  if (!content || isOverloaded) throw new Error('__HR_INSIGHTS_EMPTY__')

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('__HR_INSIGHTS_EMPTY__')
  return JSON.parse(jsonMatch[0]) as HrInsightsData
}
