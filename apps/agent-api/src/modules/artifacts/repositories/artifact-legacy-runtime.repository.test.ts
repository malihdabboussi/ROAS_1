import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyRuntimeRepository } from './artifact-legacy-runtime.repository'

function makeSupabase(responses: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0
  const terminal = {
    maybeSingle: vi.fn(async () => responses[callIndex++] ?? { data: null, error: null }),
    eq: vi.fn(() => terminal),
    is: vi.fn(() => terminal),
  }
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => terminal),
    })),
    terminal,
  }
}

describe('ArtifactLegacyRuntimeRepository', () => {
  const repository = new ArtifactLegacyRuntimeRepository()

  it('falls back to the platform system registry row for protected agents like loop', async () => {
    const supabase = makeSupabase([
      { data: null, error: null },
      {
        data: {
          agent_key: 'loop',
          level: 'system',
          role: 'Flows Builder',
          config: { capability_profile: 'system_flows', capability_domain: 'flows' },
        },
        error: null,
      },
    ])

    const result = await repository.findAgentForAuthorization(supabase as any, {
      userId: 'user-1',
      agentKey: 'loop',
      orgId: null,
    })

    expect(result.data).toMatchObject({
      agent_key: 'loop',
      config: { capability_profile: 'system_flows' },
    })
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('does not fall back for unknown non-system agents', async () => {
    const supabase = makeSupabase([{ data: null, error: null }])

    const result = await repository.findAgentForAuthorization(supabase as any, {
      userId: 'user-1',
      agentKey: 'ghost',
      orgId: null,
    })

    expect(result.data).toBeNull()
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
