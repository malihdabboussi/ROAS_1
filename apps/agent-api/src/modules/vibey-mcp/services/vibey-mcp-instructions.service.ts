import { Injectable } from '@nestjs/common'
import {
  MCP_BASE_SCOPE,
  MCP_PERMISSION_GROUPS,
  MCP_V1_SCOPES,
  MCP_V1_TOOL_CATALOG,
} from '@vibey/agent-policy'
import { resolveMcpResourceUrl } from '../vibey-mcp-platform-defaults'

@Injectable()
export class VibeyMcpInstructionsService {
  buildInstructions(): string {
    const resourceUrl = resolveMcpResourceUrl()
    const docsUrl = (process.env.VIBEY_DOCS_BASE_URL ?? 'http://localhost:3011').replace(/\/+$/, '')
    const toolsByAction = new Map(MCP_V1_TOOL_CATALOG.map((tool) => [tool.action, tool.toolName]))
    const groupGuide = MCP_PERMISSION_GROUPS.map((group) => {
      const tools = group.includedActions
        .map((action) => toolsByAction.get(action))
        .filter((toolName): toolName is NonNullable<typeof toolName> => !!toolName)
        .join(', ')
      return `- ${group.label}: ${group.description} Tools: ${tools || 'none'}.`
    }).join('\n')

    return [
      '# Vibey MCP Server',
      '',
      'Use this server to work with Vibey data and non-destructive Vibey actions through user-approved OAuth scopes.',
      '',
      '## Auth Model',
      '',
      `- OAuth scope base: ${MCP_BASE_SCOPE}.`,
      `- Supported scopes: ${MCP_V1_SCOPES.join(', ')}.`,
      '- OAuth tokens determine the current user and organization. Do not pass user_id or org_id in tool arguments.',
      '',
      '## Tool Selection Guide',
      '',
      groupGuide,
      '',
      '## Required Preflight',
      '',
      '- Use prompts/list for guided Vibey workflows.',
      '- Use resources/list for longer Vibey MCP playbooks.',
      '- Call describe_vibey_action before calling an unfamiliar tool so you have the exact action contract.',
      '- Use search_vibey_docs for Vibey product, policy, and workflow questions before guessing behavior.',
      '- Prefer read/list tools before create/update tools when you need existing IDs.',
      '- For the UI General workspace, list accessible campaigns, select the unique campaign with config.system_kind="general", then call list_spaces with its campaign_id. general=true only returns Spaces where campaign_id is null.',
      '- For skills, the database is the source of truth; use Agent Skill MCP tools, not filesystem-only SKILL.md files.',
      '- For saving to any Brain/context surface, prefer atlas_save_brain_context unless the user explicitly asks for a direct low-level tool.',
      '',
      '## Boundaries',
      '',
      '- The v1 catalog avoids destructive, billing, SQL, publish, send, and external MCP-management actions.',
      '- Tool calls return JSON in structuredContent when available.',
      '- If a scope is missing, ask the user to reconnect and approve the needed permission.',
      '',
      '## Useful Links',
      '',
      `- Protected resource metadata: ${resourceUrl}/.well-known/oauth-protected-resource`,
      `- Vibey docs: ${docsUrl}`,
    ].join('\n')
  }
}
