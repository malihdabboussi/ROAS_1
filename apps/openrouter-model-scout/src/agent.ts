import { OpenRouter, stepCountIs } from '@openrouter/agent'
import type { AgentConfig } from './config.js'
import { resolveRouterPlugins } from './router-config.js'
import type { ModelScoutSession } from './session.js'
import { createTools } from './tools/index.js'

export type AgentEvent =
  | { arguments: Record<string, unknown>; name: string; type: 'tool_call' }
  | { delta: string; type: 'text' }

export interface AgentRunResult {
  cost: number | null
  inputTokens: number
  model: string
  outputTokens: number
  responseId: string
  text: string
}

export async function runAgent(
  config: AgentConfig,
  session: ModelScoutSession,
  input: string,
  onEvent: (event: AgentEvent) => void,
): Promise<AgentRunResult> {
  const client = new OpenRouter({
    apiKey: config.apiKey,
    appTitle: 'ROAS Model Scout',
    httpReferer: 'https://roas.io',
  })
  const tools = createTools(config.apiKey)
  const result = client.callModel({
    input,
    instructions: config.systemPrompt,
    metadata: { app: 'roas-model-scout', workload: 'model-discovery' },
    model: config.model,
    plugins: resolveRouterPlugins(config.model, config.allowedModels, config.costQualityTradeoff),
    sessionId: session.id,
    state: session.state,
    stopWhen: stepCountIs(config.maxSteps),
    tools,
  })

  const textTask = (async () => {
    for await (const delta of result.getTextStream()) {
      onEvent({ delta, type: 'text' })
    }
  })()
  const toolTask = (async () => {
    for await (const call of result.getToolCallsStream()) {
      onEvent({
        arguments: call.arguments as Record<string, unknown>,
        name: call.name,
        type: 'tool_call',
      })
    }
  })()
  await Promise.all([textTask, toolTask])

  const response = await result.getResponse()
  return {
    cost: response.usage?.cost ?? null,
    inputTokens: response.usage?.inputTokens ?? 0,
    model: response.model,
    outputTokens: response.usage?.outputTokens ?? 0,
    responseId: response.id,
    text: response.outputText ?? '',
  }
}
