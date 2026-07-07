import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentSyncService } from './agent-sync.service'

const USER_ID = '19847dc5-a29a-4684-87d0-4cf6560baa10'

function createQuery(data: unknown[] = [], error: { message: string } | null = null) {
  const result = Promise.resolve({ data, error })
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: data[0] ?? null, error })),
    then: result.then.bind(result),
  }
  return query
}

describe('AgentSyncService materialization data access', () => {
  const originalAgentsBaseDir = process.env.AGENTS_BASE_DIR
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-agent-sync-materialization-'))
    process.env.AGENTS_BASE_DIR = path.join(tmpDir, 'agents')
  })

  afterEach(async () => {
    if (originalAgentsBaseDir === undefined) delete process.env.AGENTS_BASE_DIR
    else process.env.AGENTS_BASE_DIR = originalAgentsBaseDir
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('materializes syncAll definitions and registers the agent workspace', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agent_definitions') {
          return createQuery([
            {
              agent_key: 'atlas',
              file_name: 'SOUL.md',
              content: '# Soul',
              archetype_filter: null,
              user_id: null,
              org_id: null,
            },
          ])
        }
        if (table === 'agents_registry') {
          return createQuery([{ agent_key: 'atlas', role: 'Guide', level: 'employee', config: {} }])
        }
        return createQuery([])
      }),
    }
    const config = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
        if (key === 'USER_ID') return USER_ID
        return fallback ?? ''
      }),
    }
    const gateway = {
      beginBatch: vi.fn(),
      commitBatch: vi.fn(),
      ensureAgent: vi.fn().mockResolvedValue({ ok: true }),
    }
    const service = new AgentSyncService(
      config as any,
      { client: supabase } as any,
      gateway as any,
      {
        resolveRuntimeSkillScope: vi.fn().mockResolvedValue({ skills: [], resources: [] }),
      } as any,
    )

    const result = await service.syncAll()

    expect(result.healthy).toBe(true)
    expect(await fs.readFile(path.join(process.env.AGENTS_BASE_DIR!, 'atlas', 'SOUL.md'), 'utf8'))
      .toBe('# Soul')
    expect(gateway.ensureAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: 'atlas',
        workspace: path.join(process.env.AGENTS_BASE_DIR!, 'atlas'),
      }),
    )
  })

  it('materializes vibey-api for system agents like loop from the system registry row', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agent_definitions') {
          return createQuery([
            {
              file_name: 'SOUL.md',
              content: '# Loop Soul',
              archetype_filter: null,
              user_id: null,
              org_id: null,
            },
          ])
        }
        if (table === 'agents_registry') {
          return createQuery([
            {
              agent_key: 'loop',
              role: 'Flows Builder',
              level: 'system',
              config: { capability_profile: 'system_flows', capability_domain: 'flows' },
            },
          ])
        }
        if (table === 'agent_workflows') return createQuery([])
        return createQuery([])
      }),
    }
    const config = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
        if (key === 'USER_ID') return USER_ID
        if (key === 'AGENT_RUNTIME_MODE') return ''
        return fallback ?? ''
      }),
    }
    const gateway = {
      beginBatch: vi.fn(),
      commitBatch: vi.fn(),
      ensureAgent: vi.fn().mockResolvedValue({ ok: true }),
    }
    const service = new AgentSyncService(
      config as any,
      { client: supabase } as any,
      gateway as any,
      {
        resolveRuntimeSkillScope: vi.fn().mockResolvedValue({ skills: [], resources: [] }),
      } as any,
    ) as any
    service.loadSystemAgentKeys = vi.fn().mockResolvedValue(new Set(['loop']))

    const result = await service.syncAgent('loop', USER_ID)

    const vibeyApiDir = path.join(process.env.AGENTS_BASE_DIR!, 'loop', 'skills', 'vibey-api')
    expect(result.healthy).toBe(true)
    await expect(fs.readFile(path.join(vibeyApiDir, 'SKILL.md'), 'utf8')).resolves.toContain(
      'vibey-api',
    )
    const allowedActions = JSON.parse(
      await fs.readFile(path.join(vibeyApiDir, 'ALLOWED_ACTIONS.json'), 'utf8'),
    )
    expect(allowedActions.agent_key).toBe('loop')
    expect(allowedActions.allowed_actions).toEqual(
      expect.arrayContaining(['get_flow_build_context', 'create_flow_clarification']),
    )
  })

  it('materializes org agent definitions and registers the org workspace', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agent_definitions') {
          return createQuery([
            {
              agent_key: 'atlas',
              file_name: 'SOUL.md',
              content: '# Org Soul',
              archetype_filter: null,
              user_id: null,
              org_id: null,
            },
          ])
        }
        return createQuery([])
      }),
    }
    const config = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
        if (key === 'USER_ID') return USER_ID
        return fallback ?? ''
      }),
    }
    const gateway = {
      beginBatch: vi.fn(),
      commitBatch: vi.fn(),
      ensureAgent: vi.fn().mockResolvedValue({ ok: true }),
    }
    const service = new AgentSyncService(
      config as any,
      { client: supabase } as any,
      gateway as any,
      {
        resolveRuntimeSkillScope: vi.fn().mockResolvedValue({ skills: [], resources: [] }),
      } as any,
    )

    const result = await service.syncOrgAgent('org-1', 'atlas')

    const expectedWorkspace = path.join(process.env.AGENTS_BASE_DIR!, 'orgs', 'org-1', 'atlas')
    expect(result.healthy).toBe(true)
    expect(await fs.readFile(path.join(expectedWorkspace, 'SOUL.md'), 'utf8')).toBe('# Org Soul')
    expect(gateway.ensureAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: 'org-org-1-atlas',
        workspace: expectedWorkspace,
      }),
    )
  })

  it('discovers org agents through active memberships', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'org_members') return createQuery([{ org_id: 'org-1' }])
        if (table === 'agents_registry') return createQuery([{ agent_key: 'atlas' }])
        return createQuery([])
      }),
    }
    const service = new AgentSyncService(
      {
        get: vi.fn((key: string, fallback?: string) => {
          if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
          return fallback ?? ''
        }),
      } as any,
      { client: supabase } as any,
      {} as any,
      {} as any,
    ) as any
    service.syncOrgAgent = vi.fn(async () => ({
      synced: 2,
      expected: 2,
      failed: [],
      retried: 0,
      retriedOk: 0,
      healthy: true,
    }))

    await expect(service.syncAllOrgAgents(USER_ID)).resolves.toEqual({ synced: 2, failed: [] })
    expect(service.syncOrgAgent).toHaveBeenCalledWith('org-1', 'atlas', true)
  })

  it('syncs owner shared skills into an agent workspace', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'org_members') return createQuery([{ org_id: 'org-1' }])
        if (table === 'organizations') return createQuery([{ owner_id: 'owner-1' }])
        if (table === 'org_shared_skills') {
          return createQuery([{ skill_name: 'Playbook', skill_content: '# Playbook' }])
        }
        return createQuery([])
      }),
    }
    const service = new AgentSyncService(
      {
        get: vi.fn((key: string, fallback?: string) => {
          if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
          return fallback ?? ''
        }),
      } as any,
      { client: supabase } as any,
      {} as any,
      {} as any,
    ) as any
    const agentDir = path.join(process.env.AGENTS_BASE_DIR!, 'atlas')

    await expect(
      service.syncSharedSkillsForAgent({
        userId: USER_ID,
        orgId: null,
        agentDir,
        agentKey: 'atlas',
      }),
    ).resolves.toBe(1)
    await expect(
      fs.readFile(path.join(agentDir, 'skills', 'org-playbook', 'SKILL.md'), 'utf8'),
    ).resolves.toContain('# Playbook')
  })

  it('loads library fallback resources for skill keys', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'skill_library_resources') {
          return createQuery([
            {
              skill_key: 'writer',
              file_path: 'references/style.md',
              content: '# Style',
              content_type: 'text/markdown',
              storage_url: null,
            },
          ])
        }
        return createQuery([])
      }),
    }
    const service = new AgentSyncService(
      {
        get: vi.fn((key: string, fallback?: string) => {
          if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
          return fallback ?? ''
        }),
      } as any,
      { client: supabase } as any,
      {} as any,
      {} as any,
    ) as any

    await expect(service.fetchLibraryResources(['writer'])).resolves.toEqual([
      expect.objectContaining({ skill_key: 'writer', file_path: 'references/style.md' }),
    ])
  })

  it('syncs Brain narrative pages and logs into the agent workspace', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') {
          return createQuery([
            { id: 'brain-1', agent_id: null, campaign_id: null, is_default: true },
          ])
        }
        if (table === 'ns_narrative_pages') {
          return createQuery([
            { slug: 'capsule', content_md: '# Capsule', page_type: 'capsule' },
            { slug: 'index', content_md: '# Index', page_type: 'index' },
          ])
        }
        if (table === 'ns_brain_log') {
          return createQuery([
            {
              event_type: 'updated',
              summary: 'Refreshed narrative',
              affected_pages: ['capsule'],
              created_at: '2026-06-19T03:00:00.000Z',
            },
          ])
        }
        return createQuery([])
      }),
    }
    const service = new AgentSyncService(
      {
        get: vi.fn((key: string, fallback?: string) => {
          if (key === 'AGENTS_BASE_DIR') return process.env.AGENTS_BASE_DIR ?? fallback ?? ''
          return fallback ?? ''
        }),
      } as any,
      { client: supabase } as any,
      {} as any,
      {} as any,
    ) as any
    const manifest: Array<Record<string, unknown>> = []

    await expect(service.syncBrainLibrary('atlas', USER_ID, manifest)).resolves.toBe(3)

    const brainDir = path.join(process.env.AGENTS_BASE_DIR!, 'atlas', 'brain')
    await expect(fs.readFile(path.join(brainDir, 'CAPSULE.md'), 'utf8')).resolves.toBe('# Capsule')
    await expect(fs.readFile(path.join(brainDir, 'INDEX.md'), 'utf8')).resolves.toBe('# Index')
    await expect(fs.readFile(path.join(brainDir, 'LOG.md'), 'utf8')).resolves.toContain(
      'Refreshed narrative',
    )
    expect(manifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'brain-page', filePath: path.join(brainDir, 'CAPSULE.md') }),
      ]),
    )
  })
})
