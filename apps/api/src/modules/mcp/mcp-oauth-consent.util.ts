import { BadRequestException, ForbiddenException } from '@nestjs/common'
import {
  getMcpSelectableScopes,
  isMcpScope,
  MCP_BASE_SCOPE,
  type McpScope,
} from '@vibey/agent-policy'
import type { McpConsentDto } from './dto/mcp-oauth.dto'

export interface McpAccountPreview {
  type: 'personal' | 'organization'
  id: string | null
  name: string
  avatar_url: string | null
  role?: string | null
}

export function resolveApprovedMcpScopes(
  dto: McpConsentDto,
  request: { scopes: string[] },
): McpScope[] {
  if (!dto.selected_scopes) return request.scopes as McpScope[]
  const scopes = Array.from(new Set(dto.selected_scopes))
  const hasConcreteScope = scopes.some((scope) => scope !== MCP_BASE_SCOPE)
  if (hasConcreteScope && !scopes.includes(MCP_BASE_SCOPE)) {
    throw new BadRequestException(`${MCP_BASE_SCOPE} is required when selecting MCP permissions`)
  }

  const selectableScopes = new Set(getMcpSelectableScopes())
  const requestScopeCeiling =
    request.scopes.length === 1 && request.scopes[0] === MCP_BASE_SCOPE
      ? new Set(getMcpSelectableScopes())
      : new Set(request.scopes)

  for (const scope of scopes) {
    if (!isMcpScope(scope)) throw new BadRequestException(`Unsupported MCP scope: ${scope}`)
    if (!selectableScopes.has(scope))
      throw new ForbiddenException(`MCP scope is not selectable: ${scope}`)
    if (!requestScopeCeiling.has(scope))
      throw new ForbiddenException(`Scope was not requested: ${scope}`)
  }

  return scopes as McpScope[]
}

export function resolveEffectiveMcpConsentOrgId(
  dto: McpConsentDto,
  request: { org_id: string | null },
  contextOrgId: string | null,
): string | null {
  const selectedOrgId = dto.selected_org_id === undefined ? request.org_id : dto.selected_org_id
  if ((request.org_id ?? null) !== null && selectedOrgId !== request.org_id) {
    throw new ForbiddenException('OAuth request org does not match selected account')
  }
  if ((selectedOrgId ?? null) !== (contextOrgId ?? null)) {
    throw new ForbiddenException('Selected account does not match current org context')
  }
  return selectedOrgId ?? null
}
