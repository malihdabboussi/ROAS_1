import { EmbeddingService } from '../../brain/services/embedding.service'

export type SlackTeamSignal = {
  kind: 'brain_memory' | 'workflow_discovery' | 'unanswered_question' | 'client_risk'
  target_slack_user_id: string | null
  target_channel_id: string
  source_message_ts: string
  proposed_content: string
  rationale: string
  brain_memory: string | null
  confidence: number
}

export type SlackTeamPerson = {
  id: string
  platform_id: string
  display_name: string
  vibey_user_id: string | null
  relationship_kind: string
  delivery_mode: string
  person_brain_id: string | null
}

type SlackTeamMessage = {
  channel_id: string
  channel_name: string
  ts: string
  thread_ts: string | null
  user: string
  text: string
}

const SLACK_TEAM_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['brain_memory', 'workflow_discovery', 'unanswered_question', 'client_risk'],
          },
          target_slack_user_id: { type: 'string', nullable: true },
          target_channel_id: { type: 'string' },
          source_message_ts: { type: 'string' },
          proposed_content: { type: 'string' },
          rationale: { type: 'string' },
          brain_memory: { type: 'string', nullable: true },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: [
          'kind',
          'target_slack_user_id',
          'target_channel_id',
          'source_message_ts',
          'proposed_content',
          'rationale',
          'brain_memory',
          'confidence',
        ],
      },
    },
  },
  required: ['signals'],
}

export async function analyzeSlackTeamMessages(input: {
  gemini: EmbeddingService
  userId: string
  orgId: string
  loopKind: string
  instructions?: string
  messages: SlackTeamMessage[]
  people: SlackTeamPerson[]
  maxSignals: number
}) {
  const signals: SlackTeamSignal[] = []
  let modelCalls = 0
  let inputTokens = 0
  let outputTokens = 0
  let totalTokens = 0
  let providerCostUsd = 0
  for (let offset = 0; offset < input.messages.length; offset += 250) {
    const remaining = input.maxSignals - signals.length
    if (remaining <= 0) break
    const people = new Map(input.people.map((person) => [person.platform_id, person]))
    const transcript = input.messages
      .slice(offset, offset + 250)
      .map(
        (message) =>
          `[${message.channel_id}|#${message.channel_name}|${message.ts}|thread=${message.thread_ts || message.ts}] ${message.user === 'PIXEL_BOT' ? 'Pixel (bot)' : people.has(message.user) ? `${people.get(message.user)?.display_name} (${people.get(message.user)?.relationship_kind})` : message.user}: ${message.text.slice(0, 1200)}`,
      )
      .join('\n')
    const prompt = [
      'Analyze recent Slack messages for a proactive team agent.',
      `Requested loop: ${input.loopKind}. Return at most ${remaining} high-confidence signals.`,
      'Only use explicit evidence in the messages. Do not infer private facts or invent commitments.',
      'Pixel (bot) messages are reply context only. Never create a Person Brain fact about Pixel or target PIXEL_BOT.',
      'brain_memory: a durable fact about the named speaker that belongs in their Person Brain.',
      'workflow_discovery: a repeated manual process with a concrete automation proposal.',
      'unanswered_question: a direct question that appears unanswered in the supplied window.',
      'Messages with the same thread value are one Slack thread. A question is answered when a later human reply in that thread addresses it; never flag that as unanswered.',
      'client_risk: an explicit blocker, missed commitment, dissatisfaction, or delivery risk.',
      'Never propose messaging an external or ignored person. For a signal about them, write an internal finding for the team to review.',
      'proposed_content must be the finding only: concrete, human, and free of system disclaimers like "Pixel will not message". Do not write the delivery framing; delivery adds that later.',
      'For every signal, copy the exact channel id and source timestamp from its bracket.',
      'Return only JSON: {"signals":[{"kind":"brain_memory|workflow_discovery|unanswered_question|client_risk","target_slack_user_id":"string or null","target_channel_id":"string","source_message_ts":"string","proposed_content":"string","rationale":"string","brain_memory":"string or null","confidence":0.0}]}',
      input.instructions ? `Additional admin instructions: ${input.instructions}` : '',
      '',
      transcript,
    ]
      .filter(Boolean)
      .join('\n')
    const completion = await input.gemini.callGeminiWithUsage(
      prompt,
      undefined,
      { userId: input.userId, orgId: input.orgId },
      {
        maxOutputTokens: 8192,
        responseSchema: SLACK_TEAM_ANALYSIS_SCHEMA,
        thinkingLevel: 'low',
      },
    )
    const parsed = JSON.parse(completion.text) as { signals?: SlackTeamSignal[] }
    if (!Array.isArray(parsed.signals)) {
      throw new Error('Slack team observation returned invalid analysis')
    }
    signals.push(...parsed.signals)
    modelCalls += 1
    inputTokens += completion.usage.inputTokens
    outputTokens += completion.usage.outputTokens
    totalTokens += completion.usage.totalTokens
    providerCostUsd += completion.providerCostUsd
  }
  return { signals, modelCalls, inputTokens, outputTokens, totalTokens, providerCostUsd }
}
