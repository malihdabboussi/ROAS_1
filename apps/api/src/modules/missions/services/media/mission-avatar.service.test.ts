import { describe, expect, it, vi } from 'vitest'
import { MissionAvatarService } from './mission-avatar.service'

function createAgentRegistryClient() {
  const patches: Record<string, unknown>[] = []
  const filters: Array<[string, unknown]> = []

  const createUpdateQuery = () => {
    const query = {
      update: vi.fn((patch: Record<string, unknown>) => {
        patches.push(patch)
        return query
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value])
        return query
      }),
      is: vi.fn((column: string, value: unknown) => {
        filters.push([column, value])
        return Promise.resolve({ error: null })
      }),
    }
    return query
  }

  return {
    patches,
    filters,
    supabase: {
      from: vi.fn(() => createUpdateQuery()),
    },
  }
}

describe('MissionAvatarService', () => {
  it('marks avatar generation in-flight then persists the generated image URL', async () => {
    const registry = createAgentRegistryClient()
    const mediaService = {
      generateImage: vi.fn().mockResolvedValue({ success: true, url: 'https://cdn/avatar.png' }),
    }
    const gateway = {
      getServiceRoleClient: vi.fn(() => registry.supabase),
    }
    const service = new MissionAvatarService(mediaService as any, gateway as any)

    await service.generateAgentAvatar('user-1', 'atlas', 'Atlas', 'Researcher', null)

    expect(gateway.getServiceRoleClient).toHaveBeenCalledTimes(2)
    expect(registry.supabase.from).toHaveBeenCalledWith('agents_registry')
    expect(registry.patches).toEqual([
      { generating_avatar_at: expect.any(String) },
      { image_url: 'https://cdn/avatar.png', generating_avatar_at: null },
    ])
    expect(registry.filters).toContainEqual(['agent_key', 'atlas'])
    expect(registry.filters).toContainEqual(['user_id', 'user-1'])
    expect(registry.filters).toContainEqual(['org_id', null])
  })
})
