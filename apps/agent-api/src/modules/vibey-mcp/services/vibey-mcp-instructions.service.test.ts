import { describe, expect, it } from 'vitest'
import { MCP_PERMISSION_GROUPS, MCP_V1_TOOL_CATALOG } from '@vibey/agent-policy'
import { VibeyMcpInstructionsService } from './vibey-mcp-instructions.service'

describe('VibeyMcpInstructionsService', () => {
  it('defaults protected resource links to ROAS', () => {
    const previous = process.env.MCP_RESOURCE_URL
    delete process.env.MCP_RESOURCE_URL

    const instructions = new VibeyMcpInstructionsService().buildInstructions()

    expect(instructions).toContain('https://mcp.roas.io/.well-known/oauth-protected-resource')
    expect(instructions).not.toContain('mcp.vibey.im')

    if (previous === undefined) delete process.env.MCP_RESOURCE_URL
    else process.env.MCP_RESOURCE_URL = previous
  })

  it('includes every v1 tool, permission group, and identity rule', () => {
    const instructions = new VibeyMcpInstructionsService().buildInstructions()

    for (const tool of MCP_V1_TOOL_CATALOG) {
      expect(instructions).toContain(tool.toolName)
    }
    for (const group of MCP_PERMISSION_GROUPS) {
      expect(instructions).toContain(group.label)
    }
    expect(instructions).toContain('describe_vibey_action')
    expect(instructions).toContain('search_vibey_docs')
    expect(instructions).toContain('prompts/list')
    expect(instructions).toContain('resources/list')
    expect(instructions).toContain('database is the source of truth')
    expect(instructions).toContain('atlas_save_brain_context')
    expect(instructions).toContain('Do not pass user_id or org_id')
  })
})
