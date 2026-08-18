import type { ActionPreflightContext, ActionPreflightFailure } from './artifact-action-preflight'
import { isPortalCampaignDraftTool } from './artifact-mcp-fulfillment-stamp'

export async function validateUseMcpToolPreflight(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): Promise<ActionPreflightFailure | null> {
  const args = data.arguments ?? data.args ?? {}
  if (!isRecord(args)) return failure('arguments must be an object')
  const toolName = stringValue(data.tool_name ?? data.tool)
  if (!toolName) return failure('tool_name is required')

  const host = context?.host
  const artifactMcpService = host?.artifactMcpService
  const mcpConfig = artifactMcpService?.mcpConfig
  const mcpTool = artifactMcpService?.mcpTool
  const mcpRepository = artifactMcpService?.artifactMcpRepository
  if (!host || !mcpConfig || !mcpTool || !mcpRepository) return null

  try {
    const userId = host.resolveUserId(context?.sessionKey)
    const supabase = await host.getUserClient(userId, context?.sessionKey as string)
    const projectId = await mcpRepository.findFirstProjectId(supabase)
    if (!projectId) return failure('No project context')

    const serverName = stringValue(data.server_name)
    const serverId = stringValue(data.server_id)
    const server = serverId
      ? await mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await mcpConfig.getServerByName(supabase, projectId, serverName)
        : null
    if (!server) return failure('MCP server not found')
    if (!server.enabled || !server.agent_enabled) return failure('MCP server is disabled')

    const tool = await resolveLiveMcpTool({
      toolName,
      server,
      mcpTool,
      supabase,
      authToken: await mcpConfig.getAuthToken(supabase, server),
    })
    if (!tool) return missingMcpToolFailure(toolName, String(server.name ?? 'this server'))

    const schemaError = validateJsonSchemaArgs(tool.inputSchema, args)
    if (schemaError) return failure(schemaError)
  } catch {
    return null
  }

  return null
}

async function resolveLiveMcpTool(input: {
  toolName: string
  server: { name?: string; cached_tools?: unknown }
  mcpTool: {
    listTools: (
      server: unknown,
      supabase: unknown,
      authToken?: string | null,
    ) => Promise<Array<Record<string, unknown>>>
  }
  supabase: unknown
  authToken?: string | null
}): Promise<Record<string, unknown> | null> {
  const cached = Array.isArray(input.server.cached_tools) ? input.server.cached_tools : []
  const fromCache = cached.find(
    (candidate) => isRecord(candidate) && stringValue(candidate.name) === input.toolName,
  )
  if (fromCache && isRecord(fromCache)) return fromCache

  const live = await input.mcpTool.listTools(input.server, input.supabase, input.authToken)
  const fromLive = live.find(
    (candidate) => isRecord(candidate) && stringValue(candidate.name) === input.toolName,
  )
  return fromLive && isRecord(fromLive) ? fromLive : null
}

function missingMcpToolFailure(toolName: string, serverName: string): ActionPreflightFailure {
  const campaignFallback = isPortalCampaignDraftTool(toolName)
    ? ' If no live campaign-draft write exists, use native create_campaign, include the returned url, and create_task for missing VSL, landing page, or launch assets.'
    : ''
  return {
    ...failure(
      `${toolName} is not available on MCP server ${serverName}.${campaignFallback} Call list_mcp_tools and use an exact live tool name.`,
    ),
    agentDiagnosis:
      'The requested MCP tool is not in the live server catalog, so the create was rejected before anything was saved.',
    agentInstruction: isPortalCampaignDraftTool(toolName)
      ? 'Do not retry the guessed campaign-draft tool name. Call list_mcp_tools on The ROAS Portal server and use the exact live write. If none exists, call native create_campaign with a name, post the returned url, and create_task for missing VSL, landing page, or launch assets.'
      : 'Do not retry the same tool name. Call list_mcp_tools and use an exact live tool name and inputSchema.',
    correction: {
      summary:
        'Use a live MCP tool name, or native create_campaign when no campaign-draft write exists.',
      next_tool_preference: isPortalCampaignDraftTool(toolName)
        ? ['list_mcp_tools', 'create_campaign', 'create_task']
        : ['list_mcp_tools'],
    },
  }
}

function failure(error: string, code = 'ARTIFACT_ACTION_PREFLIGHT'): ActionPreflightFailure {
  return {
    error,
    errorCode: code,
    agentDiagnosis: 'The payload failed action-specific preflight before runtime work started.',
    agentInstruction:
      'Do not retry the same payload. Inspect describe_action output, correct the named field, and retry once.',
    correction: {
      summary: 'Correct the action-specific field named by preflight validation.',
      next_tool_preference: ['describe_action'],
    },
    observability: { fingerprint: 'artifact.action_preflight' },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPresent(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

export function validateJsonSchemaArgs(
  schema: unknown,
  args: Record<string, unknown>,
): string | null {
  if (!isRecord(schema)) return null
  return validateJsonSchemaValue(schema, args, 'arguments')
}

function validateJsonSchemaValue(
  schema: Record<string, unknown>,
  value: unknown,
  path: string,
): string | null {
  const required = Array.isArray(schema.required)
    ? schema.required.filter((entry): entry is string => typeof entry === 'string')
    : []
  if (isRecord(value)) {
    for (const key of required) {
      if (!isPresent(value[key])) return `${path}.${key} is required by MCP inputSchema`
    }
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type
  if (type === 'object' && !isRecord(value)) return `${path} must be an object`
  if (type === 'array' && !Array.isArray(value)) return `${path} must be an array`
  if (type === 'string' && typeof value !== 'string') return `${path} must be a string`
  if (type === 'number' && typeof value !== 'number') return `${path} must be a number`
  if (type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
    return `${path} must be an integer`
  }
  if (type === 'boolean' && typeof value !== 'boolean') return `${path} must be a boolean`

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return `${path} must be one of ${schema.enum.map(String).join(', ')}`
  }

  const properties = isRecord(schema.properties) ? schema.properties : {}
  if (isRecord(value)) {
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).find(
        (key) => !Object.prototype.hasOwnProperty.call(properties, key),
      )
      if (unknown) return `${path}.${unknown} is not allowed by MCP inputSchema`
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (value[key] === undefined || !isRecord(childSchema)) continue
      const error = validateJsonSchemaValue(childSchema, value[key], `${path}.${key}`)
      if (error) return error
    }
  }

  if (Array.isArray(value) && isRecord(schema.items)) {
    for (let index = 0; index < value.length; index += 1) {
      const error = validateJsonSchemaValue(schema.items, value[index], `${path}[${index}]`)
      if (error) return error
    }
  }

  return null
}
