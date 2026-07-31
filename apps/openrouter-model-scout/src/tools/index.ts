import { serverTool } from '@openrouter/agent'
import { createModelTools } from './model-tools.js'

export function createTools(apiKey: string) {
  return [
    ...createModelTools(apiKey),
    serverTool({ type: 'openrouter:web_search' }),
    serverTool({ type: 'openrouter:datetime', parameters: { timezone: 'America/Los_Angeles' } }),
  ] as const
}
