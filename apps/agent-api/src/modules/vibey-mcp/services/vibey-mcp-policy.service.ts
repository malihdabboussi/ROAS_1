import { ForbiddenException, Injectable } from '@nestjs/common'
import {
  assertNoForbiddenMcpIdentityArgs,
  getMcpToolByName,
  type McpToolCatalogEntry,
} from '@vibey/agent-policy'
import type { VibeyMcpToolCallContext } from '../types/vibey-mcp.types'

@Injectable()
export class VibeyMcpPolicyService {
  assertAllowed(context: VibeyMcpToolCallContext): McpToolCatalogEntry {
    const tool = getMcpToolByName(context.toolName)
    if (!tool) throw new ForbiddenException(`MCP tool is not registered: ${context.toolName}`)
    assertNoForbiddenMcpIdentityArgs(context.args)
    const tokenScopes = new Set(context.claims.scopes)
    const missingScope = tool.requiredScopes.find((scope) => !tokenScopes.has(scope))
    if (missingScope) throw new ForbiddenException(`Missing MCP scope: ${missingScope}`)
    return tool
  }
}
