import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import registerBackendPlugin, {
  getOnHoldActionsForTests,
  getSupportedActionsForTests,
  loadAllowedActions,
  parseAgentIdentityFromSessionKey,
  PLUGIN_LOCAL_ACTIONS,
} from '../../../../../docker/tools/vibey-backend/index'
import { ON_HOLD_PROMPTMODE_ACTIONS } from '../../../../../packages/agent-policy/src/action-lifecycle'
import { ACTIONS as POLICY_ACTIONS } from '../../../../../packages/agent-policy/src/actions'
import { MCP_V1_TOOL_CATALOG } from '../../../../../packages/agent-policy/src/mcp-catalog'
import { VALID_ACTIONS } from '../artifacts/dtos/artifact-action.dto'

describe('vibey backend plugin workspace policy loading', () => {
  const originalAgentsBaseDir = process.env.AGENTS_BASE_DIR
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-backend-plugin-'))
    process.env.AGENTS_BASE_DIR = path.join(tmpDir, 'agents')
  })

  afterEach(async () => {
    if (originalAgentsBaseDir === undefined) delete process.env.AGENTS_BASE_DIR
    else process.env.AGENTS_BASE_DIR = originalAgentsBaseDir
    vi.unstubAllGlobals()
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('loads allowed actions from user-scoped personal workspace', async () => {
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const identity = parseAgentIdentityFromSessionKey(
      `agent:user-${userId}-vibey:user-${userId}-vibey-${userId}-00000000-0000-4000-8000-000000000001`,
    )
    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'users',
      userId,
      'vibey',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({ allowed_actions: ['save_user_memory'] }),
      'utf-8',
    )

    expect(identity).toEqual({ agentKey: 'vibey', userId })
    expect(loadAllowedActions(identity!.agentKey, identity!.orgId, identity!.userId)).toEqual([
      'save_user_memory',
    ])
  })

  it('filters stale on-hold actions from scoped allowed actions', async () => {
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'users',
      userId,
      'vibey',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({
        allowed_actions: ['save_user_memory', 'create_project', 'supabase_run_sql'],
      }),
      'utf-8',
    )

    expect(loadAllowedActions('vibey', undefined, userId)).toEqual(['save_user_memory'])
  })

  it('backfills audio transcription into stale scoped media action allowlists', async () => {
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'users',
      userId,
      'vibey',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({ allowed_actions: ['analyze_video', 'extract_url_transcript'] }),
      'utf-8',
    )

    expect(loadAllowedActions('vibey', undefined, userId)).toEqual([
      'analyze_video',
      'extract_url_transcript',
      'transcribe_audio',
    ])
  })

  it('routes transcribe_audio through the legacy analyze_video backend contract', async () => {
    let factory:
      | ((ctx: { sessionKey?: string }) => {
          execute: (
            id: string,
            params: { action: string; label: string; data: Record<string, unknown> },
          ) => Promise<unknown>
        })
      | undefined
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ success: true }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    registerBackendPlugin({
      config: {
        plugins: {
          entries: {
            'vibey-backend': { config: { backendUrl: 'http://backend.test' } },
          },
        },
      },
      logger: { info: vi.fn() },
      registerTool: (toolFactory: typeof factory) => {
        factory = toolFactory
      },
    })

    const tool = factory?.({ sessionKey: 'agent:main' })
    await tool?.execute('call-1', {
      action: 'transcribe_audio',
      label: 'Transcribing audio',
      data: { media_url: 'https://example.com/voice.ogg' },
    })

    const request = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined
    expect(request).toBeDefined()
    expect(JSON.parse(request!.body!)).toEqual({
      action: 'analyze_video',
      data: {
        media_url: 'https://example.com/voice.ogg',
        extract_frames: false,
        transcribe: true,
      },
    })
  })

  it('includes Space schema field and calendar actions in the default supported action list', () => {
    expect(getSupportedActionsForTests()).toEqual(
      expect.arrayContaining([
        'create_space_field',
        'update_space_field',
        'list_calendar_events',
        'create_calendar_event',
        'update_calendar_event',
        'delete_calendar_event',
      ]),
    )
  })

  it('includes native Contacts actions in the default supported action list', () => {
    expect(getSupportedActionsForTests()).toEqual(
      expect.arrayContaining([
        'list_contacts',
        'get_contact',
        'create_contact',
        'update_contact',
        'add_contact_note',
        'update_contact_note',
        'get_contact_activity',
        'list_contact_communications',
      ]),
    )
  })

  it('keeps Dream Ops actions out of normal HR sessions but exposes them in HR dream sessions', async () => {
    let factory:
      | ((ctx: { sessionKey?: string }) => {
          parameters?: Record<string, any>
          execute: (
            id: string,
            params: { action: string; label: string; data: Record<string, unknown> },
          ) => Promise<unknown>
        })
      | undefined

    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'organizations',
      'org-1',
      'hr',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({ allowed_actions: ['create_agent_skill', 'update_agent_skill'] }),
      'utf-8',
    )

    registerBackendPlugin({
      config: {
        plugins: {
          entries: {
            'vibey-backend': { config: { backendUrl: 'http://backend.test' } },
          },
        },
      },
      logger: { info: vi.fn() },
      registerTool: (toolFactory: typeof factory) => {
        factory = toolFactory
      },
    })

    const normal = factory?.({
      sessionKey: 'agent:org-org-1-hr:mission:hr:user-1:mission-1::org:org-1',
    })
    const dream = factory?.({
      sessionKey: 'agent:org-org-1-hr:dream_ops:hr:user-1:run-1::org:org-1',
    })
    const nonHrDream = factory?.({
      sessionKey: 'agent:org-org-1-designer:dream_ops:designer:user-1:run-1::org:org-1',
    })

    expect(normal?.parameters?.properties?.action?.enum).not.toContain('dream_propose_skill_update')
    expect(dream?.parameters?.properties?.action?.enum).toEqual(
      expect.arrayContaining([
        'dream_inspect_agent',
        'dream_search_evidence',
        'dream_propose_skill_create',
        'dream_propose_skill_update',
        'dream_propose_skill_resource_update',
        'dream_propose_agent_file_update',
        'dream_route_out',
        'dream_finish',
      ]),
    )
    expect(nonHrDream?.parameters?.properties?.action?.enum).not.toContain(
      'dream_propose_skill_update',
    )
  })

  it('keeps plugin-local actions on the tool schema for scoped allowlists', async () => {
    let factory:
      | ((ctx: { sessionKey?: string }) => {
          parameters?: Record<string, any>
          execute: (
            id: string,
            params: { action: string; label: string; data: Record<string, unknown> },
          ) => Promise<unknown>
        })
      | undefined

    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'users',
      userId,
      'vibey',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({ allowed_actions: ['save_user_memory'] }),
      'utf-8',
    )

    registerBackendPlugin({
      config: {
        plugins: {
          entries: {
            'vibey-backend': { config: { backendUrl: 'http://backend.test' } },
          },
        },
      },
      logger: { info: vi.fn() },
      registerTool: (toolFactory: typeof factory) => {
        factory = toolFactory
      },
    })

    const tool = factory?.({
      sessionKey: `agent:user-${userId}-vibey:user-${userId}-vibey-${userId}-00000000-0000-4000-8000-000000000001`,
    })
    const actionEnum = tool?.parameters?.properties?.action?.enum as string[]

    expect(actionEnum).toContain('save_user_memory')
    for (const localAction of PLUGIN_LOCAL_ACTIONS) {
      expect(actionEnum).toContain(localAction)
    }
  })

  it('executes ask_clarification locally for scoped agents without hitting the backend', async () => {
    let factory:
      | ((ctx: { sessionKey?: string }) => {
          execute: (
            id: string,
            params: { action: string; label: string; data: Record<string, unknown> },
          ) => Promise<unknown>
        })
      | undefined
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const actionsPath = path.join(
      process.env.AGENTS_BASE_DIR!,
      'users',
      userId,
      'vibey',
      'skills',
      'vibey-api',
      'ALLOWED_ACTIONS.json',
    )
    await fs.mkdir(path.dirname(actionsPath), { recursive: true })
    await fs.writeFile(
      actionsPath,
      JSON.stringify({ allowed_actions: ['save_user_memory'] }),
      'utf-8',
    )

    registerBackendPlugin({
      config: {
        plugins: {
          entries: {
            'vibey-backend': { config: { backendUrl: 'http://backend.test' } },
          },
        },
      },
      logger: { info: vi.fn() },
      registerTool: (toolFactory: typeof factory) => {
        factory = toolFactory
      },
    })

    const tool = factory?.({
      sessionKey: `agent:user-${userId}-vibey:user-${userId}-vibey-${userId}-00000000-0000-4000-8000-000000000001`,
    })
    const result = (await tool?.execute('call-1', {
      action: 'ask_clarification',
      label: 'Clarifying the request',
      data: {
        title: 'Choose a direction',
        intro_message: 'Pick one before I start.',
        questions: [
          {
            id: 'direction',
            text: 'Which direction should I take?',
            type: 'single_choice',
            options: [
              { id: 'option_a', label: 'Option A' },
              { id: 'option_b', label: 'Option B' },
            ],
            required: true,
          },
        ],
      },
    })) as { content?: Array<{ type: string; text: string }> }

    expect(fetchMock).not.toHaveBeenCalled()
    const payload = JSON.parse(result?.content?.[0]?.text ?? '{}') as Record<string, any>
    expect(payload.success).toBe(true)
    expect(payload.clarification).toMatchObject({
      title: 'Choose a direction',
      introMessage: 'Pick one before I start.',
      questions: [
        expect.objectContaining({
          id: 'direction',
          type: 'single_choice',
          required: true,
          options: [
            expect.objectContaining({ id: 'option_a', label: 'Option A' }),
            expect.objectContaining({ id: 'option_b', label: 'Option B' }),
          ],
        }),
      ],
    })
  })

  it('keeps PromptMode backend plugin actions aligned with active backend actions', () => {
    const supported = getSupportedActionsForTests()
    const localOnly = new Set(PLUGIN_LOCAL_ACTIONS)
    const backendActions = new Set(VALID_ACTIONS)
    const onHold = new Set(ON_HOLD_PROMPTMODE_ACTIONS)
    const activeBackendActions = VALID_ACTIONS.filter((action) => !onHold.has(action))

    expect(getOnHoldActionsForTests().sort()).toEqual([...ON_HOLD_PROMPTMODE_ACTIONS].sort())

    const missing = activeBackendActions.filter((action) => !supported.includes(action))
    const onHoldStillSupported = ON_HOLD_PROMPTMODE_ACTIONS.filter((action) =>
      supported.includes(action),
    )
    const unclassifiedPluginOnly = supported.filter(
      (action) =>
        !backendActions.has(action as (typeof VALID_ACTIONS)[number]) && !localOnly.has(action),
    )

    expect(missing).toEqual([])
    expect(onHoldStillSupported).toEqual([])
    expect(unclassifiedPluginOnly).toEqual([])
  })

  it('keeps PromptMode policy actions aligned with active backend actions', () => {
    const policyActions = [...POLICY_ACTIONS]
    const onHold = new Set(ON_HOLD_PROMPTMODE_ACTIONS)
    const activeBackendActions = VALID_ACTIONS.filter((action) => !onHold.has(action))
    const missing = activeBackendActions.filter((action) => !policyActions.includes(action))
    const extra = policyActions.filter(
      (action) => !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]),
    )
    const onHoldPolicyActions = ON_HOLD_PROMPTMODE_ACTIONS.filter((action) =>
      policyActions.includes(action),
    )

    expect(missing).toEqual([])
    expect(extra).toEqual([])
    expect(onHoldPolicyActions).toEqual([])
  })

  it('keeps MCP catalog actions inside backend VALID_ACTIONS', () => {
    const invalidCatalogActions = MCP_V1_TOOL_CATALOG.map((entry) => entry.action).filter(
      (action) => !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]),
    )

    expect(invalidCatalogActions).toEqual([])
  })
})
