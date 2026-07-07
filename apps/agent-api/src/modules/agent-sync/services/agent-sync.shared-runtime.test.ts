import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentSyncService } from './agent-sync.service'

function createQuery(data: unknown[] = [], error: { message: string } | null = null) {
  const result = Promise.resolve({ data, error })
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    is: () => query,
    or: () => query,
    in: () => query,
    order: () => result,
    limit: () => query,
    maybeSingle: () => Promise.resolve({ data: data[0] ?? null, error }),
    single: () => Promise.resolve({ data: data[0] ?? null, error }),
    then: result.then.bind(result),
  }
  return query
}

describe('AgentSyncService shared runtime personal workspace', () => {
  const originalAgentsBaseDir = process.env.AGENTS_BASE_DIR
  const originalRuntimeMode = process.env.AGENT_RUNTIME_MODE
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-agent-sync-shared-'))
    process.env.AGENTS_BASE_DIR = path.join(tmpDir, 'agents')
    process.env.AGENT_RUNTIME_MODE = 'shared'
  })

  afterEach(async () => {
    if (originalAgentsBaseDir === undefined) delete process.env.AGENTS_BASE_DIR
    else process.env.AGENTS_BASE_DIR = originalAgentsBaseDir
    if (originalRuntimeMode === undefined) delete process.env.AGENT_RUNTIME_MODE
    else process.env.AGENT_RUNTIME_MODE = originalRuntimeMode
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('materializes a personal agent under users/{userId}/{agentKey}', async () => {
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const agentKey = 'atlas'
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agent_definitions') {
          return createQuery([
            {
              file_name: 'SOUL.md',
              content: '# Soul',
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
        if (key === 'AGENT_RUNTIME_MODE') return process.env.AGENT_RUNTIME_MODE ?? fallback ?? ''
        if (key === 'USER_ID') return ''
        return fallback ?? ''
      }),
    }
    const gateway = {
      beginBatch: vi.fn(),
      commitBatch: vi.fn(),
      ensureAgent: vi.fn().mockResolvedValue({ ok: true }),
    }
    const skillScope = {
      resolveRuntimeSkillScope: vi.fn().mockResolvedValue({ skills: [], resources: [] }),
    }
    const service = new AgentSyncService(
      config as any,
      { client: supabase } as any,
      gateway as any,
      skillScope as any,
    )

    const result = await service.syncAgent(agentKey, userId)

    const expectedWorkspace = path.join(process.env.AGENTS_BASE_DIR!, 'users', userId, agentKey)
    expect(result.healthy).toBe(true)
    expect(await fs.readFile(path.join(expectedWorkspace, 'SOUL.md'), 'utf-8')).toBe('# Soul')
    expect(gateway.ensureAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: `user-${userId}-${agentKey}`,
        name: agentKey,
        workspace: expectedWorkspace,
      }),
    )
  })
})
