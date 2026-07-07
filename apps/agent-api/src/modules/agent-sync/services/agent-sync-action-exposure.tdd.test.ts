import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ON_HOLD_PROMPTMODE_ACTIONS } from '@vibey/agent-policy'
import { HealthController } from '../../../health.controller'
import { AgentSyncService } from './agent-sync.service'
import { generateScopedVibeyApiSkill } from './vibey-api-skill-generator'

function makeService() {
  const config = {
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
      if (key === 'USER_ID') return process.env.USER_ID ?? fallback ?? ''
      return fallback ?? ''
    }),
  }
  const svc = {
    client: {},
  }
  const gateway = {
    beginBatch: vi.fn(),
    commitBatch: vi.fn(),
  }
  return new AgentSyncService(config as any, svc as any, gateway as any, {} as any) as any
}

const USER_ID = '19847dc5-a29a-4684-87d0-4cf6560baa10'

const flowBuilderActions = [
  'search_flow_capabilities',
  'get_flow_capability',
  'list_flows',
  'get_flow',
  'create_flow_draft',
  'update_flow_draft',
  'validate_flow_draft',
  'publish_flow',
  'get_flow_build_context',
  'create_flow_clarification',
  'create_flow_plan',
  'update_flow_plan',
  'answer_flow_clarification',
  'validate_flow_plan',
  'compile_flow_plan',
  'list_flow_blueprints',
  'get_flow_blueprint',
  'create_flow_blueprint_draft',
  'validate_flow_blueprint',
  'activate_flow_blueprint',
  'evaluate_flow_plan',
] as const

function snapshotEnv(keys: string[]) {
  const original = new Map(keys.map((key) => [key, process.env[key]]))
  return () => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

describe('runtime action exposure', () => {
  it('builds runtime allowed actions only from canExecuteAction decisions', async () => {
    const service = makeService()
    service.userId = 'user-1'
    service.agentPolicyService = {
      canExecuteAction: vi.fn(async (_agentKey: string, action: string) => ({
        allowed:
          action === 'save_user_memory' ||
          action === 'create_presentation' ||
          action === 'delegate_to_agent',
        sourceLevel: 'role_default',
        domain: action === 'save_user_memory' ? 'write_user_memory' : 'write_marketing_artifacts',
        reason: 'test',
      })),
    }

    const result = await service.resolveAllowedActions(
      {
        agent_key: 'lux',
        user_id: 'user-1',
        org_id: null,
        role: 'Presentation Designer',
        level: 'employee',
        config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
      },
      { orgId: null, userId: 'user-1' },
    )

    expect(result.actions.has('save_user_memory')).toBe(true)
    expect(result.actions.has('create_presentation')).toBe(true)
    expect(result.actions.has('delegate_to_agent')).toBe(true)
    expect(result.actions.has('create_brain_page')).toBe(false)
    expect(result.actions.has('ingest_user_brain_document')).toBe(false)
    expect(result.actions.has('create_strategy_node')).toBe(false)
    expect(service.agentPolicyService.canExecuteAction).toHaveBeenCalled()
  })

  it('generates vibey-api docs from the exact allowed action set', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set(['save_user_memory', 'create_presentation']),
      'marketing',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(output).toContain('save_user_memory')
    expect(output).toContain('create_presentation')
    expect(output).toContain('Presentations are fixed-stage HTML bundles')
    expect(output).toContain('data-vibey-theme-native')
    expect(output).not.toContain('create_brain_page')
    expect(output).not.toContain('create_strategy_node')
  })

  it('filters on-hold actions out of generated vibey-api skill docs', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set(['create_presentation', 'create_project', 'supabase_run_sql']),
      'developer',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(output).toContain('create_presentation')
    for (const action of ON_HOLD_PROMPTMODE_ACTIONS) {
      expect(output).not.toContain(action)
    }
    expect(output).not.toContain('Setting up your project')
  })

  it('generates Dream Ops proposal tool docs when the dream action set is allowed', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set(['dream_propose_skill_update', 'dream_route_out', 'dream_finish']),
      'management',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(output).toContain('Dream Ops')
    expect(output).toContain('dream_propose_skill_update')
    expect(output).toContain('Use this instead of update_agent_skill during dreams')
    expect(output).toContain('database rows created by proposal tools are authoritative')
  })

  it('includes contract details for allowed action docs', () => {
    const { referenceFiles } = generateScopedVibeyApiSkill(
      new Set(['update_presentation', 'describe_action']),
      'marketing',
    )
    const output = Object.values(referenceFiles).join('\n')

    expect(output).toContain('## update_presentation')
    expect(output).toContain('**Optional keys:**')
    expect(output).toContain('`name`')
    expect(output).toContain('`title` → `name`')
    expect(output).toContain('Contract example: rename a presentation')
    expect(output).toContain('## describe_action')
  })

  it('teaches Space retrieval hierarchy through protocol references when the action is allowed', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set(['search_space_context', 'read_space_document', 'get_task', 'list_tasks']),
      'operations',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(skillMd).toContain('Space Retrieval Protocol')
    expect(skillMd).toContain('references/protocols/space-retrieval-protocol.md')
    expect(skillMd).not.toContain('Spaces are embedded work contexts')
    expect(referenceFiles['references/protocols/space-retrieval-protocol.md']).toContain(
      'Spaces are embedded work contexts',
    )
    expect(referenceFiles['references/protocols/space-retrieval-protocol.md']).toContain(
      'retrieve_via',
    )
    expect(referenceFiles['references/protocols/space-retrieval-protocol.md']).toContain(
      'query first and inspect second',
    )
    expect(output).toContain('## search_space_context')
    expect(output).toContain('Searching this Space')
  })

  it('teaches Space schema mutation through protocol references when field actions are allowed', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        'get_space',
        'create_space_field',
        'update_space_field',
        'append_space_field_option',
        'create_space_status',
        'create_space_category',
        'create_space_tag',
        'create_space_view',
        'update_space_view',
      ]),
      'operations',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(skillMd).toContain('Space Schema Mutation Protocol')
    expect(skillMd).toContain('references/protocols/space-schema-mutation-protocol.md')
    expect(referenceFiles['references/protocols/space-schema-mutation-protocol.md']).toContain(
      'Use `create_space_field` for real schema fields',
    )
    expect(referenceFiles['references/protocols/space-schema-mutation-protocol.md']).toContain(
      'Do not fake schema changes by writing only `custom_data`',
    )
    expect(referenceFiles['references/protocols/space-schema-mutation-protocol.md']).toContain(
      'Adding a status is a `create_space_status` call',
    )
    expect(referenceFiles['references/protocols/space-schema-mutation-protocol.md']).toContain(
      'append_space_field_option',
    )
    expect(output).toContain('## create_space_field')
    expect(output).toContain('Adding Launch Tags field')
    expect(output).toContain('## update_space_field')
  })

  it('teaches Brain family retrieval when brain actions are allowed', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        'search_user_brain',
        'search_company_brain',
        'resolve_agent_brain',
        'search_agent_brain',
        'search_customer_brain',
        'search_brain_context',
        'get_brain_pages',
      ]),
      'brain',
    )

    expect(skillMd).toContain('Brain Knowledge Protocol')
    expect(skillMd).toContain('references/protocols/brain-knowledge-protocol.md')
    expect(skillMd).not.toContain('Search the most specific Brain family first')
    expect(referenceFiles['references/protocols/brain-knowledge-protocol.md']).toContain(
      'Brain is durable knowledge',
    )
    expect(referenceFiles['references/protocols/brain-knowledge-protocol.md']).toContain(
      'Search the most specific Brain family first',
    )
    expect(referenceFiles['references/protocols/brain-knowledge-protocol.md']).toContain(
      'search_brain_context',
    )
  })

  it('links actions to relevant workflow skills in reference docs', () => {
    const { referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        'create_presentation',
        'create_funnel',
        'create_form',
        'attach_form_asset',
        'create_sequence',
      ]),
      'marketing',
    )
    const output = Object.values(referenceFiles).join('\n')

    expect(output).toContain('skills/presentation-builder/SKILL.md')
    expect(output).toContain('skills/funnel-builder/SKILL.md')
    expect(output).toContain('skills/vibey-api/SKILL.md')
    expect(output).toContain('attach_form_asset')
    expect(output).toContain('skills/email-sequence-builder/SKILL.md')
  })

  it('generates Loop Flow Builder action docs without generic fallbacks', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        ...flowBuilderActions,
        'get_space',
        'create_space_field',
        'update_space_field',
        'append_space_field_option',
        'create_space_status',
        'create_space_category',
        'create_space_tag',
        'create_space_view',
        'update_space_view',
      ]),
      'flows',
    )
    const flowReference = referenceFiles['references/flows.md']
    const schemaReference =
      referenceFiles['references/protocols/space-schema-mutation-protocol.md']
    const spacesReference = referenceFiles['references/spaces.md']
    const output = [skillMd, flowReference, schemaReference, spacesReference].join('\n')

    expect(skillMd).toContain('campaign_capability')
    expect(skillMd).toContain('Flow Building Protocol')
    expect(skillMd).toContain('Space Schema Mutation Protocol')
    expect(skillMd).toContain('references/protocols/space-schema-mutation-protocol.md')
    expect(flowReference).toContain('## get_flow_build_context')
    expect(flowReference).toContain('Loads the server-composed Flow build context')
    expect(flowReference).toContain('## create_flow_clarification')
    expect(flowReference).toContain('## create_flow_plan')
    expect(flowReference).toContain('"trigger":{"type":"status_change","to":"done"}')
    expect(flowReference).not.toContain('task_status_changed')
    expect(flowReference).not.toContain('clarification_questions')
    expect(flowReference).toContain('## compile_flow_plan')
    expect(flowReference).toContain('## evaluate_flow_plan')
    expect(schemaReference).toContain('align the active Space schema before planning the Flow')
    expect(spacesReference).toContain('## create_space_field')
    expect(spacesReference).toContain('## update_space_field')
    expect(spacesReference).toContain('## create_space_status')
    expect(spacesReference).toContain('## append_space_field_option')
    expect(output).not.toContain('Executes the "create_flow_plan" vibey backend action.')
    expect(output).not.toContain('ask_clarification')
  })
})

describe('agent skill image resource sync', () => {
  it('blocks skill resources that try to write outside the skill directory', async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-skill-traversal-'))
    try {
      const service = makeService()
      const manifest: any[] = []
      const synced = await service.syncAgentSkills(
        agentDir,
        [
          {
            id: 'skill-1',
            agent_key: 'vibey',
            skill_key: 'carousel-designer',
            name: 'Carousel Designer',
            description: 'design carousels',
            markdown_content: '# Carousel Designer',
            is_enabled: true,
            archetype_filter: null,
          },
        ],
        [
          {
            agent_key: '*',
            skill_key: 'carousel-designer',
            file_path: '../outside.md',
            content: '# escaped',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
        true,
        manifest,
      )

      expect(synced).toBe(0)
      await expect(fs.stat(path.join(agentDir, 'skills', 'outside.md'))).rejects.toThrow()
      expect(manifest).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'skill',
            status: 'failed',
            error: expect.stringContaining('Unsafe skill resource path'),
          }),
        ]),
      )
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true })
    }
  })

  it('writes markdown stubs and images manifest without fetching image bytes', async () => {
    const priorFetch = global.fetch
    const fetch = vi.fn()
    global.fetch = fetch as typeof fetch
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-skill-images-'))
    try {
      const service = makeService()
      const manifest: any[] = []
      await service.syncAgentSkills(
        agentDir,
        [
          {
            id: 'skill-1',
            agent_key: 'vibey',
            skill_key: 'carousel-designer',
            name: 'Carousel Designer',
            description: 'design carousels',
            markdown_content: '# Carousel Designer',
            is_enabled: true,
            archetype_filter: null,
          },
        ],
        [
          {
            agent_key: '*',
            skill_key: 'carousel-designer',
            file_path: 'references/type4-01-cover.png',
            content: 'Type 4 Cover',
            content_type: 'image/png',
            storage_url: 'https://abc.supabase.co/storage/v1/object/public/skill-assets/type4.png',
          },
          {
            agent_key: '*',
            skill_key: 'carousel-designer',
            file_path: 'references/notes.md',
            content: '# Notes',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
        true,
        manifest,
      )

      const stubPath = path.join(
        agentDir,
        'skills',
        'carousel-designer',
        'references',
        'type4-01-cover.md',
      )
      const manifestPath = path.join(
        agentDir,
        'skills',
        'carousel-designer',
        'references',
        'images.json',
      )
      const textResourcePath = path.join(
        agentDir,
        'skills',
        'carousel-designer',
        'references',
        'notes.md',
      )
      await expect(fs.readFile(stubPath, 'utf8')).resolves.toContain(
        'skill://carousel-designer/references/type4-01-cover.png',
      )
      await expect(fs.readFile(textResourcePath, 'utf8')).resolves.toBe('# Notes')
      await expect(fs.readFile(manifestPath, 'utf8')).resolves.toContain(
        '"file_path": "references/type4-01-cover.png"',
      )
      const imageManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
      expect(imageManifest).toEqual([
        {
          skill_key: 'carousel-designer',
          file_path: 'references/type4-01-cover.png',
          content_type: 'image/png',
          description: 'Type 4 Cover',
          storage_url: 'https://abc.supabase.co/storage/v1/object/public/skill-assets/type4.png',
        },
      ])
      expect(manifest.map((entry) => path.basename(entry.filePath))).toContain('images.json')
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true })
      global.fetch = priorFetch
    }
  })
})

describe('runtime pool machine mode', () => {
  it('does not fail user identity sync for pool machines without USER_ID', async () => {
    const originalPool = process.env.VIBEY_POOL_MACHINE
    const originalUserId = process.env.USER_ID
    process.env.VIBEY_POOL_MACHINE = 'true'
    delete process.env.USER_ID
    try {
      const service = makeService()
      service.onModuleInit()
      for (let i = 0; i < 10 && service.getSyncStatus() === 'pending'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      expect(service.getSyncStatus()).toBe('ok')
      expect(service.isUserIdResolved()).toBe(false)
    } finally {
      if (originalPool === undefined) delete process.env.VIBEY_POOL_MACHINE
      else process.env.VIBEY_POOL_MACHINE = originalPool
      if (originalUserId === undefined) delete process.env.USER_ID
      else process.env.USER_ID = originalUserId
    }
  })

  it('keeps pool machines live but not user-ready', () => {
    const originalPool = process.env.VIBEY_POOL_MACHINE
    process.env.VIBEY_POOL_MACHINE = 'true'
    const syncService = {
      getSyncStatus: vi.fn().mockReturnValue('ok'),
      isSharedRuntime: vi.fn().mockReturnValue(false),
      isUserIdResolved: vi.fn().mockReturnValue(false),
      getLastSyncResult: vi.fn().mockReturnValue(null),
    }
    try {
      const controller = new HealthController(syncService as never)

      expect(controller.health()).toMatchObject({
        status: 'ok',
        mode: 'pool',
        userId: 'unresolved',
      })
      expect(() => controller.readiness()).toThrow(ServiceUnavailableException)
    } finally {
      if (originalPool === undefined) delete process.env.VIBEY_POOL_MACHINE
      else process.env.VIBEY_POOL_MACHINE = originalPool
    }
  })

  it('binds a matching pool machine into user-ready mode and persists local identity', async () => {
    const restoreEnv = snapshotEnv([
      'VIBEY_POOL_MACHINE',
      'USER_ID',
      'FLY_MACHINE_ID',
      'AGENTS_BASE_DIR',
      'RUNTIME_IDENTITY_CACHE_PATH',
    ])
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-bind-'))
    process.env.VIBEY_POOL_MACHINE = 'true'
    process.env.FLY_MACHINE_ID = 'machine-1'
    process.env.AGENTS_BASE_DIR = path.join(dir, 'agents')
    process.env.RUNTIME_IDENTITY_CACHE_PATH = path.join(dir, 'identity.json')
    delete process.env.USER_ID

    try {
      const service = makeService()
      service.syncAll = vi.fn().mockResolvedValue({
        synced: 0,
        expected: 0,
        failed: [],
        retried: 0,
        retriedOk: 0,
        healthy: true,
      })

      await expect(
        service.bindRuntimeIdentity({ userId: USER_ID, machineId: 'machine-1' }),
      ).resolves.toEqual({ ok: true, user_id: USER_ID, machine_id: 'machine-1', ready: true })

      expect(service.isUserIdResolved()).toBe(true)
      expect(process.env.USER_ID).toBe(USER_ID)
      await expect(fs.readFile(process.env.RUNTIME_IDENTITY_CACHE_PATH, 'utf8')).resolves.toContain(
        USER_ID,
      )
      expect(service.syncAll).not.toHaveBeenCalled()

      const controller = new HealthController(service as never)
      expect(controller.health()).toMatchObject({
        status: 'ok',
        mode: 'user',
        userId: 'resolved',
      })
      expect(controller.readiness()).toMatchObject({
        ready: true,
        userIdResolved: true,
        gatewayReady: false,
        authReady: false,
      })
    } finally {
      restoreEnv()
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('reset clears runtime identity, readiness, cache, and managed workspace files only', async () => {
    const restoreEnv = snapshotEnv([
      'VIBEY_POOL_MACHINE',
      'USER_ID',
      'FLY_MACHINE_ID',
      'AGENTS_BASE_DIR',
      'RUNTIME_IDENTITY_CACHE_PATH',
    ])
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-reset-'))
    const agentsDir = path.join(dir, 'agents')
    process.env.VIBEY_POOL_MACHINE = 'true'
    process.env.FLY_MACHINE_ID = 'machine-1'
    process.env.AGENTS_BASE_DIR = agentsDir
    process.env.RUNTIME_IDENTITY_CACHE_PATH = path.join(dir, 'identity.json')
    delete process.env.USER_ID

    try {
      await fs.mkdir(path.join(agentsDir, 'vibey'), { recursive: true })
      await fs.writeFile(path.join(agentsDir, 'vibey', 'AGENTS.md'), '# managed', 'utf8')
      await fs.writeFile(path.join(agentsDir, 'vibey', 'custom.txt'), 'preserve', 'utf8')
      const service = makeService()
      service.syncAll = vi.fn().mockResolvedValue({
        synced: 0,
        expected: 0,
        failed: [],
        retried: 0,
        retriedOk: 0,
        healthy: true,
      })

      await service.bindRuntimeIdentity({ userId: USER_ID, machineId: 'machine-1' })
      await expect(service.resetRuntimeIdentity({ machineId: 'machine-1' })).resolves.toEqual({
        ok: true,
        machine_id: 'machine-1',
        ready: false,
      })

      expect(service.isUserIdResolved()).toBe(false)
      expect(process.env.USER_ID).toBeUndefined()
      await expect(fs.stat(process.env.RUNTIME_IDENTITY_CACHE_PATH)).rejects.toThrow()
      await expect(fs.stat(path.join(agentsDir, 'vibey', 'AGENTS.md'))).rejects.toThrow()
      await expect(fs.readFile(path.join(agentsDir, 'vibey', 'custom.txt'), 'utf8')).resolves.toBe(
        'preserve',
      )
      const controller = new HealthController(service as never)
      expect(() => controller.readiness()).toThrow(ServiceUnavailableException)
    } finally {
      restoreEnv()
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('rejects bind and reset for mismatched machine ids without changing current identity', async () => {
    const restoreEnv = snapshotEnv(['VIBEY_POOL_MACHINE', 'USER_ID', 'FLY_MACHINE_ID'])
    process.env.VIBEY_POOL_MACHINE = 'true'
    process.env.FLY_MACHINE_ID = 'machine-1'
    delete process.env.USER_ID
    try {
      const service = makeService()
      service.syncAll = vi.fn().mockResolvedValue({
        synced: 0,
        expected: 0,
        failed: [],
        retried: 0,
        retriedOk: 0,
        healthy: true,
      })

      await service.bindRuntimeIdentity({ userId: USER_ID, machineId: 'machine-1' })
      await expect(
        service.bindRuntimeIdentity({ userId: USER_ID, machineId: 'machine-2' }),
      ).rejects.toThrow('Machine identity mismatch')
      await expect(service.resetRuntimeIdentity({ machineId: 'machine-2' })).rejects.toThrow(
        'Machine identity mismatch',
      )

      expect(service.isUserIdResolved()).toBe(true)
      expect(process.env.USER_ID).toBe(USER_ID)
    } finally {
      restoreEnv()
    }
  })

  it('serializes concurrent bind and reset operations so the last request wins', async () => {
    const restoreEnv = snapshotEnv(['VIBEY_POOL_MACHINE', 'USER_ID', 'FLY_MACHINE_ID'])
    process.env.VIBEY_POOL_MACHINE = 'true'
    process.env.FLY_MACHINE_ID = 'machine-1'
    delete process.env.USER_ID
    try {
      const service = makeService()
      service.syncAll = vi.fn().mockResolvedValue({
        synced: 0,
        expected: 0,
        failed: [],
        retried: 0,
        retriedOk: 0,
        healthy: true,
      })

      await Promise.all([
        service.bindRuntimeIdentity({ userId: USER_ID, machineId: 'machine-1' }),
        service.resetRuntimeIdentity({ machineId: 'machine-1' }),
      ])

      expect(service.isUserIdResolved()).toBe(false)
      expect(process.env.USER_ID).toBeUndefined()
    } finally {
      restoreEnv()
    }
  })
})
