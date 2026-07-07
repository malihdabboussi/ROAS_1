import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

type JsonRecord = Record<string, unknown>

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number | null
  result?: T
  error?: {
    code: number
    message: string
  }
}

interface McpTool {
  name: string
  description?: string
  inputSchema?: JsonRecord
}

interface McpPrompt {
  name: string
  description?: string
}

interface McpResource {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

interface SmokeResult {
  tool: string
  status: 'passed' | 'failed' | 'skipped'
  args?: JsonRecord
  error?: string
  result_keys?: string[]
}

interface InitializeResult {
  protocolVersion: string
  instructions?: string
  capabilities?: JsonRecord
}

const MCP_URL = process.env.MCP_SMOKE_URL ?? 'http://localhost:3003'
const MCP_TOKEN = process.env.MCP_SMOKE_TOKEN ?? ''
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-')
const LOG_PATH = join(__dirname, 'logs', `vibey-mcp-smoke-${RUN_ID}.json`)

let nextId = 1

function requireEnv(name: string, value: string): string {
  if (!value.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

async function rpc<T = unknown>(method: string, params?: JsonRecord): Promise<T> {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('MCP_SMOKE_TOKEN', MCP_TOKEN)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method,
      ...(params ? { params } : {}),
    }),
  })
  const body = (await response.json()) as JsonRpcResponse<T>
  if (body.error) throw new Error(body.error.message)
  return body.result as T
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function resultKeys(value: unknown): string[] {
  const record = asRecord(value)
  return record ? Object.keys(record).sort() : []
}

async function callTool(tool: string, args: JsonRecord): Promise<unknown> {
  const result = await rpc<{
    structuredContent?: unknown
    content?: Array<{ type: string; text: string }>
  }>('tools/call', {
    name: tool,
    arguments: args,
  })
  return result.structuredContent ?? result
}

function recordCheck(
  results: SmokeResult[],
  tool: string,
  passed: boolean,
  error: string,
  resultKeysValue: string[] = [],
): void {
  results.push({
    tool,
    status: passed ? 'passed' : 'failed',
    ...(passed ? { result_keys: resultKeysValue } : { error }),
  })
}

async function describeAction(actionName: string): Promise<unknown> {
  return callTool('describe_vibey_action', { action_name: actionName })
}

function smokeTsx(name: string): string {
  return `export default function ${name.replace(/[^A-Za-z0-9_]/g, '') || 'SmokePage'}() {
  return (
    <main>
      <section>
        <h1>MCP smoke page</h1>
        <p>This page verifies the hosted Vibey MCP funnel page contract.</p>
      </section>
    </main>
  )
}`
}

async function runTool(
  results: SmokeResult[],
  tool: string,
  args: JsonRecord | null,
  context: JsonRecord,
): Promise<unknown | null> {
  if (!args) {
    results.push({ tool, status: 'skipped', error: 'Missing required smoke context' })
    return null
  }
  try {
    const result = await callTool(tool, args)
    results.push({ tool, status: 'passed', args, result_keys: resultKeys(result) })
    return result
  } catch (error) {
    results.push({
      tool,
      status: 'failed',
      args,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    context[tool] = args
  }
}

function getId(value: unknown): string | null {
  const record = asRecord(value)
  const id = record?.id
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
}

function getArray(value: unknown, key: string): JsonRecord[] {
  const record = asRecord(value)
  const list = record?.[key]
  return Array.isArray(list) ? list.filter((item): item is JsonRecord => !!asRecord(item)) : []
}

async function main(): Promise<void> {
  const initializeResult = await rpc<InitializeResult>('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'vibey-mcp-smoke-runner', version: '1.0.0' },
  })

  const listResult = await rpc<{ tools: McpTool[] }>('tools/list')
  const promptListResult = await rpc<{ prompts: McpPrompt[] }>('prompts/list')
  const resourceListResult = await rpc<{ resources: McpResource[] }>('resources/list')
  const tools = listResult.tools.map((tool) => tool.name).sort()
  const prompts = promptListResult.prompts.map((prompt) => prompt.name).sort()
  const resources = resourceListResult.resources.map((resource) => resource.uri).sort()
  const results: SmokeResult[] = []
  const context: JsonRecord = {}

  const capabilities = asRecord(initializeResult.capabilities)
  recordCheck(
    results,
    'initialize:instructions',
    typeof initializeResult.instructions === 'string' &&
      initializeResult.instructions.includes('describe_vibey_action') &&
      !!asRecord(capabilities?.tools) &&
      !!asRecord(capabilities?.prompts) &&
      !!asRecord(capabilities?.resources),
    'initialize result is missing instructions or tools/prompts/resources capabilities',
    ['instructions', 'capabilities'],
  )

  const requiredPrompts = [
    'vibey_mcp_start_here',
    'vibey_spaces_navigation',
    'vibey_brain_search_and_save',
    'vibey_create_agent_skill',
    'vibey_campaign_work',
  ]
  recordCheck(
    results,
    'prompts/list:guidance',
    requiredPrompts.every((prompt) => prompts.includes(prompt)),
    `missing prompts: ${requiredPrompts.filter((prompt) => !prompts.includes(prompt)).join(', ')}`,
    requiredPrompts,
  )

  const skillPrompt = await rpc<{
    messages?: Array<{ content?: { text?: string } }>
  }>('prompts/get', { name: 'vibey_create_agent_skill' })
  const skillPromptText = skillPrompt.messages
    ?.map((message) => message.content?.text ?? '')
    .join('\n')
  recordCheck(
    results,
    'prompts/get:vibey_create_agent_skill',
    typeof skillPromptText === 'string' &&
      skillPromptText.includes('list_agents') &&
      skillPromptText.includes('upload_agent_skill_image_reference') &&
      skillPromptText.includes('database-first'),
    'vibey_create_agent_skill prompt is missing agent skill workflow guidance',
    ['messages'],
  )

  const requiredResources = [
    'vibey://mcp/workflows/overview',
    'vibey://mcp/workflows/spaces',
    'vibey://mcp/workflows/brains',
    'vibey://mcp/workflows/agent-skills',
    'vibey://mcp/workflows/campaigns',
  ]
  recordCheck(
    results,
    'resources/list:guidance',
    requiredResources.every((resource) => resources.includes(resource)),
    `missing resources: ${requiredResources
      .filter((resource) => !resources.includes(resource))
      .join(', ')}`,
    requiredResources,
  )

  const skillResource = await rpc<{
    contents?: Array<{ text?: string }>
  }>('resources/read', { uri: 'vibey://mcp/workflows/agent-skills' })
  const skillResourceText = skillResource.contents?.map((content) => content.text ?? '').join('\n')
  recordCheck(
    results,
    'resources/read:agent_skills',
    typeof skillResourceText === 'string' &&
      skillResourceText.includes('database-first') &&
      skillResourceText.includes('agent_skill_resources') &&
      skillResourceText.includes('upload_agent_skill_image_reference'),
    'agent skills resource is missing DB-first or image reference guidance',
    ['contents'],
  )

  const docsTool = listResult.tools.find((tool) => tool.name === 'search_vibey_docs')
  const spaceSearchTool = listResult.tools.find((tool) => tool.name === 'search_space_context')
  const docsRequired = Array.isArray(docsTool?.inputSchema?.required)
    ? (docsTool?.inputSchema?.required as unknown[])
    : []
  const spaceSearchRequired = Array.isArray(spaceSearchTool?.inputSchema?.required)
    ? (spaceSearchTool?.inputSchema?.required as unknown[])
    : []
  const schemaOnlyFallbackTools = listResult.tools.filter((tool) => {
    const schema = asRecord(tool.inputSchema)
    if (!schema) return true
    const properties = asRecord(schema.properties)
    if (properties && Object.keys(properties).length > 0) return false
    return !String(schema.description ?? '').includes('describe_vibey_action')
  })
  recordCheck(
    results,
    'tools/list:schema_coverage',
    !!docsTool &&
      docsRequired.includes('query') &&
      !!spaceSearchTool &&
      spaceSearchRequired.includes('query') &&
      schemaOnlyFallbackTools.length === 0,
    `schema coverage failed: search_vibey_docs query required=${docsRequired.includes('query')}, search_space_context query required=${spaceSearchRequired.includes('query')}, fallback-only tools=${schemaOnlyFallbackTools.map((tool) => tool.name).join(', ')}`,
    ['tools'],
  )

  const requiredSpaceTools = [
    'list_spaces',
    'get_space',
    'list_space_views',
    'get_space_view',
    'list_space_view_items',
    'get_space_item',
    'list_tasks',
    'get_task',
  ]
  const toolSet = new Set(tools)
  recordCheck(
    results,
    'tools/list:spaces_navigation',
    requiredSpaceTools.every((tool) => toolSet.has(tool)),
    `missing Spaces tools: ${requiredSpaceTools.filter((tool) => !toolSet.has(tool)).join(', ')}`,
    requiredSpaceTools,
  )

  const requiredBrainTools = [
    'list_accessible_brains',
    'resolve_agent_brain',
    'atlas_save_brain_context',
  ]
  recordCheck(
    results,
    'tools/list:brain_navigation',
    requiredBrainTools.every((tool) => toolSet.has(tool)),
    `missing Brain tools: ${requiredBrainTools.filter((tool) => !toolSet.has(tool)).join(', ')}`,
    requiredBrainTools,
  )

  const requiredAgentSkillTools = [
    'list_agents',
    'list_agent_skills',
    'create_agent_skill',
    'create_agent_skill_reference',
    'upload_agent_skill_image_reference',
  ]
  recordCheck(
    results,
    'tools/list:agent_skills',
    requiredAgentSkillTools.every((tool) => toolSet.has(tool)),
    `missing Agent Skill tools: ${requiredAgentSkillTools.filter((tool) => !toolSet.has(tool)).join(', ')}`,
    requiredAgentSkillTools,
  )

  const docsResult = await runTool(
    results,
    'search_vibey_docs',
    { query: 'campaign dashboard', match_count: 3 },
    context,
  )
  const docsRecord = asRecord(docsResult)
  recordCheck(
    results,
    'search_vibey_docs:citations',
    Array.isArray(docsRecord?.citations) && docsRecord.citations.length >= 1,
    'search_vibey_docs did not return citations',
    resultKeys(docsResult),
  )

  for (const tool of tools) {
    const actionNameByTool: Record<string, string> = {
      create_email_sequence: 'create_sequence',
      save_space_document: 'save_document',
      describe_vibey_action: 'describe_action',
      search_brains: 'search_brain_context',
      list_accessible_brains: 'list_available_brain_scopes',
      list_agents: 'list_team',
      create_agent_skill_reference: 'create_agent_skill_resource',
      upload_agent_skill_image_reference: 'upload_skill_asset',
    }
    await describeAction(actionNameByTool[tool] ?? tool).catch((error) => {
      results.push({
        tool: `${tool}:describe`,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  const campaign = await runTool(
    results,
    'create_campaign',
    { name: `MCP Smoke ${RUN_ID}`, campaign_type: 'get-more-leads' },
    context,
  )
  const campaignId = getId(campaign) ?? process.env.MCP_SMOKE_CAMPAIGN_ID ?? null

  await runTool(results, 'list_campaigns', {}, context)
  await runTool(results, 'get_campaign', campaignId ? { campaign_id: campaignId } : null, context)

  const campaignSpaces = await runTool(
    results,
    'list_spaces',
    campaignId ? { campaign_id: campaignId, limit: 5 } : null,
    context,
  )
  const spaceId =
    process.env.MCP_SMOKE_SPACE_ID ?? getId(getArray(campaignSpaces, 'spaces')[0]) ?? null
  await runTool(results, 'get_space', spaceId ? { space_id: spaceId } : null, context)
  const spaceViews = await runTool(
    results,
    'list_space_views',
    spaceId ? { space_id: spaceId } : null,
    context,
  )
  const viewId =
    process.env.MCP_SMOKE_SPACE_VIEW_ID ?? getId(getArray(spaceViews, 'views')[0]) ?? null
  await runTool(
    results,
    'get_space_view',
    spaceId && viewId ? { space_id: spaceId, view_id: viewId } : null,
    context,
  )
  const viewItems = await runTool(
    results,
    'list_space_view_items',
    spaceId && viewId ? { space_id: spaceId, view_id: viewId, limit: 5 } : null,
    context,
  )
  const itemId =
    process.env.MCP_SMOKE_SPACE_ITEM_ID ?? getId(getArray(viewItems, 'items')[0]) ?? null
  await runTool(
    results,
    'get_space_item',
    spaceId && itemId ? { space_id: spaceId, item_id: itemId } : null,
    context,
  )
  const tasks = await runTool(
    results,
    'list_tasks',
    spaceId ? { space_id: spaceId, limit: 5, include_closed: true } : null,
    context,
  )
  const taskId = process.env.MCP_SMOKE_TASK_ID ?? getId(getArray(tasks, 'tasks')[0]) ?? null
  await runTool(
    results,
    'get_task',
    spaceId && taskId ? { space_id: spaceId, task_id: taskId } : null,
    context,
  )

  const funnel = await runTool(
    results,
    'create_funnel',
    campaignId ? { campaign_id: campaignId, name: `MCP Smoke Funnel ${RUN_ID}` } : null,
    context,
  )
  const funnelId = getId(funnel) ?? process.env.MCP_SMOKE_FUNNEL_ID ?? null
  await runTool(results, 'list_funnels', campaignId ? { campaign_id: campaignId } : null, context)

  const page = await runTool(
    results,
    'add_funnel_page',
    funnelId
      ? {
          funnel_id: funnelId,
          name: 'Smoke Landing',
          slug: `smoke-${RUN_ID}`,
          page_type: 'opt-in',
          generated_html: smokeTsx('SmokeLandingPage'),
        }
      : null,
    context,
  )
  const pageId = getId(page) ?? process.env.MCP_SMOKE_FUNNEL_PAGE_ID ?? null
  await runTool(
    results,
    'update_funnel_page',
    pageId ? { funnel_page_id: pageId, name: 'Smoke Landing Updated' } : null,
    context,
  )

  const sequence = await runTool(
    results,
    'create_email_sequence',
    campaignId ? { campaign_id: campaignId, name: `MCP Smoke Sequence ${RUN_ID}` } : null,
    context,
  )
  const sequenceId = getId(sequence) ?? process.env.MCP_SMOKE_SEQUENCE_ID ?? null
  await runTool(results, 'list_sequences', campaignId ? { campaign_id: campaignId } : null, context)
  await runTool(
    results,
    'add_sequence_email',
    sequenceId ? { sequence_id: sequenceId, subject: 'Smoke email', body: 'Smoke body' } : null,
    context,
  )

  await runTool(
    results,
    'create_mission',
    { title: `MCP Smoke Mission ${RUN_ID}`, ...(campaignId ? { campaign_id: campaignId } : {}) },
    context,
  )
  await runTool(results, 'list_missions', { limit: 5 }, context)

  await runTool(
    results,
    'save_user_memory',
    { content: `MCP smoke memory ${RUN_ID}`, memory_type: 'fact' },
    context,
  )
  await runTool(results, 'list_user_brain_memories', { limit: 3 }, context)
  await runTool(results, 'list_accessible_brains', {}, context)
  await runTool(results, 'search_user_brain', { query: 'MCP smoke', limit: 3 }, context)
  await runTool(results, 'search_brains', { query: 'MCP smoke', limit: 3 }, context)
  await runTool(results, 'search_customer_brain', { query: 'customer', limit: 3 }, context)
  await runTool(results, 'search_company_brain', { query: 'company', limit: 3 }, context)
  await runTool(
    results,
    'search_agent_brain',
    process.env.MCP_SMOKE_AGENT_BRAIN_ID
      ? { brain_id: process.env.MCP_SMOKE_AGENT_BRAIN_ID, query: 'agent', limit: 3 }
      : null,
    context,
  )
  await runTool(
    results,
    'resolve_agent_brain',
    process.env.MCP_SMOKE_AGENT_KEY
      ? { agent_key: process.env.MCP_SMOKE_AGENT_KEY }
      : process.env.MCP_SMOKE_AGENT_BRAIN_ID
        ? { brain_id: process.env.MCP_SMOKE_AGENT_BRAIN_ID }
        : null,
    context,
  )
  await runTool(
    results,
    'atlas_save_brain_context',
    {
      target_brain: 'user',
      content: `MCP router user memory ${RUN_ID}`,
      intent: 'fact',
      title: `MCP router user memory ${RUN_ID}`,
    },
    context,
  )
  await runTool(
    results,
    'atlas_save_brain_context',
    {
      target_brain: 'company',
      content: `Hosted Vibey MCP router smoke company object ${RUN_ID}.`,
      intent: 'belief',
      title: `MCP router company belief ${RUN_ID}`,
    },
    context,
  )
  await runTool(
    results,
    'atlas_save_brain_context',
    process.env.MCP_SMOKE_CUSTOMER_CONTACT_ID
      ? {
          target_brain: 'customer',
          contact_id: process.env.MCP_SMOKE_CUSTOMER_CONTACT_ID,
          content: `MCP router customer memory ${RUN_ID}`,
          intent: 'fact',
          title: `MCP router customer memory ${RUN_ID}`,
        }
      : null,
    context,
  )
  await runTool(
    results,
    'atlas_save_brain_context',
    process.env.MCP_SMOKE_AGENT_BRAIN_ID || process.env.MCP_SMOKE_AGENT_KEY
      ? {
          target_brain: 'agent',
          brain_id: process.env.MCP_SMOKE_AGENT_BRAIN_ID,
          agent_key: process.env.MCP_SMOKE_AGENT_KEY,
          content: `MCP router agent training note ${RUN_ID}`,
          title: `MCP router agent note ${RUN_ID}`,
        }
      : null,
    context,
  )
  await runTool(
    results,
    'propose_company_brain_signal',
    {
      signal_type: 'belief',
      truth: 'Hosted Vibey MCP smoke test object.',
      source_title: `MCP smoke belief ${RUN_ID}`,
    },
    context,
  )

  const agents = await runTool(results, 'list_agents', {}, context)
  const smokeAgentKey =
    process.env.MCP_SMOKE_AGENT_KEY ??
    (typeof getArray(agents, 'team')[0]?.agent_key === 'string'
      ? String(getArray(agents, 'team')[0]?.agent_key)
      : null)
  await runTool(
    results,
    'list_agent_skills',
    smokeAgentKey ? { agent_key: smokeAgentKey } : null,
    context,
  )
  const shouldWriteSkill = process.env.MCP_SMOKE_WRITE_AGENT_SKILL === '1'
  const smokeSkillKey =
    process.env.MCP_SMOKE_AGENT_SKILL_KEY ??
    `mcp_smoke_skill_${RUN_ID.replace(/[^a-zA-Z0-9_]/g, '_')}`
  await runTool(
    results,
    'create_agent_skill',
    shouldWriteSkill && smokeAgentKey
      ? {
          agent_key: smokeAgentKey,
          skill_key: smokeSkillKey,
          name: `MCP Smoke Skill ${RUN_ID}`,
          description: 'Temporary skill created by the hosted Vibey MCP smoke runner.',
          markdown_content:
            '# MCP Smoke Skill\n\nUse attached references only for smoke verification.',
        }
      : null,
    context,
  )
  await runTool(
    results,
    'create_agent_skill_reference',
    shouldWriteSkill && smokeAgentKey
      ? {
          agent_key: smokeAgentKey,
          skill_key: smokeSkillKey,
          file_path: 'references/mcp-smoke.md',
          content: '# MCP Smoke Reference\n\nThis reference verifies skill resource creation.',
        }
      : null,
    context,
  )
  await runTool(
    results,
    'upload_agent_skill_image_reference',
    shouldWriteSkill && smokeAgentKey && process.env.MCP_SMOKE_SKILL_IMAGE_URL
      ? {
          agent_key: smokeAgentKey,
          skill_key: smokeSkillKey,
          image_url: process.env.MCP_SMOKE_SKILL_IMAGE_URL,
          description: `mcp-smoke-image-${RUN_ID}.png`,
        }
      : null,
    context,
  )

  const doc = await runTool(
    results,
    'save_space_document',
    campaignId
      ? {
          campaign_id: campaignId,
          title: `MCP Smoke Doc ${RUN_ID}`,
          content: '# MCP Smoke Doc\nThis document verifies MCP document round-trip.',
        }
      : null,
    context,
  )
  const documentId = getId(doc) ?? process.env.MCP_SMOKE_DOCUMENT_ID ?? null
  const docRecord = asRecord(doc)
  const documentSpaceId =
    (typeof docRecord?.space_id === 'string' ? docRecord.space_id : null) ?? spaceId
  await runTool(results, 'list_documents', campaignId ? { campaign_id: campaignId } : null, context)
  await runTool(results, 'get_document', documentId ? { document_id: documentId } : null, context)
  await runTool(
    results,
    'read_space_document',
    documentSpaceId && (process.env.MCP_SMOKE_SPACE_DOCUMENT_ID ?? documentId)
      ? {
          space_id: documentSpaceId,
          document_id: process.env.MCP_SMOKE_SPACE_DOCUMENT_ID ?? documentId,
        }
      : null,
    context,
  )

  const report = {
    run_id: RUN_ID,
    endpoint: MCP_URL,
    tool_count: tools.length,
    tools,
    summary: {
      passed: results.filter((result) => result.status === 'passed').length,
      failed: results.filter((result) => result.status === 'failed').length,
      skipped: results.filter((result) => result.status === 'skipped').length,
    },
    results,
  }

  await mkdir(dirname(LOG_PATH), { recursive: true })
  await writeFile(LOG_PATH, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
