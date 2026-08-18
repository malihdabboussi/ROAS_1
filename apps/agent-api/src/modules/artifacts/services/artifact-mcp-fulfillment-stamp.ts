/**
 * Platform chokepoint helpers: stamp the active ROAS conversation into Page Grader
 * fulfillment and campaign-draft creates so review links resume the same Pixel chat.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PORTAL_DRAFT_CREATE_TOOL_RE =
  /create_fulfillment_request|create_campaign_draft|create_portal_campaign/i

export function isFulfillmentCreateTool(toolName: string): boolean {
  return PORTAL_DRAFT_CREATE_TOOL_RE.test(toolName.trim())
}

export function isPortalCampaignDraftTool(toolName: string): boolean {
  return /create_campaign_draft|create_portal_campaign/i.test(toolName.trim())
}

export function formatMcpToolCallFailure(input: {
  toolName: string
  serverName: string
  errorText?: string
}): string {
  const raw = (input.errorText ?? '').trim()
  const base =
    raw ||
    `MCP tool ${input.toolName} on ${input.serverName} failed before a durable result. Call list_mcp_tools and follow the live inputSchema.`
  if (!isPortalCampaignDraftTool(input.toolName)) return base
  return `${base} If no live campaign-draft write exists, use native create_campaign, include the returned url, and create_task for missing VSL, landing page, or launch assets.`
}

export function mcpToolFailureResult(input: {
  toolName: string
  serverName: string
  errorText?: string
}): Record<string, unknown> {
  const campaign = isPortalCampaignDraftTool(input.toolName)
  return {
    success: false,
    error: formatMcpToolCallFailure(input),
    error_code: 'ARTIFACT_MCP_TOOL_FAILED',
    error_class: 'validation',
    reliability: 'probable',
    effect_state: 'failed_before_effect',
    retry_policy: {
      mode: 'retry_with_corrected_payload',
      max_attempts: 1,
      stop_after_same_error: true,
      reason: campaign
        ? 'Use a live campaign-draft write or native create_campaign.'
        : 'Use a live MCP tool name and inputSchema.',
    },
    correction: {
      summary: campaign
        ? 'List live Portal tools, or create_campaign if no campaign-draft write exists.'
        : 'List live MCP tools and retry with the exact name and schema.',
      next_tool_preference: campaign
        ? ['list_mcp_tools', 'create_campaign', 'create_task']
        : ['list_mcp_tools'],
    },
    fallback: campaign
      ? { summary: 'Create the campaign natively and add tasks for missing launch assets.' }
      : null,
    agent_diagnosis: 'The MCP write was rejected before a durable record was saved.',
    agent_instruction: campaign
      ? 'Do not retry the same guessed campaign-draft payload. Call list_mcp_tools and use the exact live write. If none exists, call native create_campaign with a name, post the returned url, and create_task for missing VSL, landing page, or launch assets.'
      : 'Call list_mcp_tools and retry with an exact live tool name and inputSchema.',
    user_explanation: {
      intent: 'correct_and_retry',
      sentence: campaign
        ? 'I could not save that campaign through the Portal write, so I will create it in ROAS and add tasks for anything still missing.'
        : 'I need to use a different available tool for that step.',
    },
    forbidden_user_framing: [
      'platform error',
      'platform problem',
      'backend problem',
      'internal issue',
    ],
    observability: { fingerprint: 'artifact.mcp_tool_failed' },
  }
}

export function stampConversationIntoFulfillmentArgs(
  toolArgs: Record<string, unknown>,
  conversationId: string,
): Record<string, unknown> {
  if (!UUID_RE.test(conversationId)) return toolArgs

  const next: Record<string, unknown> = { ...toolArgs }
  const existingTop = readString(next.conversation_id) || readString(next.conversationId)
  if (!existingTop) next.conversation_id = conversationId

  const sourceRaw = next.source_context ?? next.sourceContext
  const source =
    sourceRaw && typeof sourceRaw === 'object' && !Array.isArray(sourceRaw)
      ? { ...(sourceRaw as Record<string, unknown>) }
      : {}
  const existingSource = readString(source.conversation_id) || readString(source.conversationId)
  if (!existingSource) source.conversation_id = conversationId
  next.source_context = source
  return next
}

export function extractFulfillmentDraftId(result: unknown): string | null {
  const root = asRecord(result)
  const candidates: unknown[] = [
    root.draft_id,
    root.draftId,
    asRecord(root.draft).draft_id,
    asRecord(root.draft).id,
    asRecord(root.result).draft_id,
    asRecord(asRecord(root.result).draft).draft_id,
    asRecord(asRecord(root.result).draft).id,
  ]
  for (const value of candidates) {
    const id = readString(value)
    if (UUID_RE.test(id)) return id
  }
  return null
}

export async function stampDraftConversationViaApi(input: {
  draftId: string
  conversationId: string
  fetchImpl?: typeof fetch
}): Promise<{ ok: boolean; status?: number }> {
  const apiUrl = (
    process.env.MAIN_API_URL ??
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    ''
  ).replace(/\/+$/, '')
  const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
  if (!apiUrl || !internalToken) return { ok: false }

  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(`${apiUrl}/api/internal/work-requests/stamp-conversation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${internalToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draft_id: input.draftId,
        conversation_id: input.conversationId,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    return { ok: response.ok, status: response.status }
  } catch {
    return { ok: false }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
