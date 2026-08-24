import { describe, expect, it } from 'vitest'
import { VibeyMcpPromptCatalogService } from './vibey-mcp-prompt-catalog.service'
import { VibeyMcpResourceCatalogService } from './vibey-mcp-resource-catalog.service'

describe('Vibey MCP User Brain topic guidance', () => {
  it('teaches MCP clients to synthesize personal topics from cited evidence', () => {
    const prompt = new VibeyMcpPromptCatalogService().getPrompt('vibey_synthesize_user_brain_topic')
    const resource = new VibeyMcpResourceCatalogService().getResource(
      'vibey://mcp/workflows/user-brain-topic-synthesis',
    )
    const text = [
      prompt?.description,
      ...(prompt?.messages.map((message) => message.content.text) ?? []),
      resource?.text,
    ].join('\n')

    expect(text).toContain('synthesize_user_brain_topic')
    expect(text).toContain('evidence')
    expect(text).toContain('E1')
    expect(text).toContain('coverage')
    expect(text).toContain('Do not invent')
  })
})
