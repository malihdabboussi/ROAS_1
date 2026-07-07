import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AgentSkillManagementService } from './agent-skill-management.service'

function chain<T extends object>(value: T): T & {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
} {
  const query = {
    ...value,
    select: vi.fn(function (this: unknown) {
      return this
    }),
    eq: vi.fn(function (this: unknown) {
      return this
    }),
    maybeSingle: vi.fn().mockResolvedValue(value),
  }
  return query as T & {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
}

describe('AgentSkillManagementService', () => {
  it('strips official skill markdown and resource bodies for non-admin viewers', async () => {
    const supabase = {}
    const missionsRepository = {
      listAgentSkills: vi.fn().mockResolvedValue([
        {
          id: 'official-1',
          user_id: null,
          org_id: null,
          source: 'system',
          skill_key: 'official',
          markdown_content: '# Official instructions',
          resources: [
            {
              id: 'resource-1',
              file_path: 'docs/ref.md',
              content: '# Private reference',
              content_type: 'text/markdown',
            },
          ],
        },
        {
          id: 'custom-1',
          user_id: 'user-1',
          org_id: null,
          source: 'user',
          skill_key: 'custom',
          markdown_content: '# Custom instructions',
          resources: [{ id: 'resource-2', file_path: 'notes.md', content: '# Custom reference' }],
        },
      ]),
      readUserPlatformRole: vi.fn().mockResolvedValue({ data: { role: 'user' }, error: null }),
    }
    const service = new AgentSkillManagementService(
      missionsRepository as never,
      { triggerAgentSkillsSync: vi.fn() } as never,
    )

    const rows = await service.listAgentSkills(supabase as never, 'user-1', 'vibey')

    expect(rows[0]).not.toHaveProperty('markdown_content')
    expect(rows[0].resources?.[0]).not.toHaveProperty('content')
    expect(rows[1]).toMatchObject({
      markdown_content: '# Custom instructions',
      resources: [{ content: '# Custom reference' }],
    })
  })

  it.each(['admin', 'superadmin'])('keeps official skill bodies for %s viewers', async (role) => {
    const supabase = {}
    const missionsRepository = {
      listAgentSkillsForAgents: vi.fn().mockResolvedValue([
        {
          id: 'official-1',
          user_id: null,
          org_id: null,
          source: 'system',
          skill_key: 'official',
          markdown_content: '# Official instructions',
          resources: [{ id: 'resource-1', file_path: 'docs/ref.md', content: '# Private ref' }],
        },
      ]),
      readUserPlatformRole: vi.fn().mockResolvedValue({ data: { role }, error: null }),
    }
    const service = new AgentSkillManagementService(
      missionsRepository as never,
      { triggerAgentSkillsSync: vi.fn() } as never,
    )

    await expect(
      service.listAgentSkillsForAgents(supabase as never, 'user-1', ['vibey']),
    ).resolves.toEqual([
      expect.objectContaining({
        markdown_content: '# Official instructions',
        resources: [expect.objectContaining({ content: '# Private ref' })],
      }),
    ])
  })

  it('blocks edits to canonical platform skills on system agents', async () => {
    const skillRow = { data: { user_id: null, org_id: null }, error: null }
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn(() => chain(skillRow)),
    }
    const missionsRepository = {
      canManageAgent: vi.fn().mockResolvedValue(true),
      getAgentSkillOwnership: vi.fn().mockResolvedValue(skillRow.data),
    }
    const service = new AgentSkillManagementService(
      missionsRepository as never,
      { triggerAgentSkillsSync: vi.fn() } as never,
    )

    await expect(
      service.updateAgentSkill(supabase as never, 'user-1', 'atlas', 'skill-1', {
        name: 'New name',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('uploads a skill asset and records the public resource URL', async () => {
    const publicUrl = 'https://cdn.example.test/user-1/pixel/research/file.pdf'
    const skillResource = {
      id: 'resource-1',
      file_path: 'assets/file.pdf',
      storage_url: publicUrl,
    }
    const bucket = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl } })),
    }
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      storage: {
        from: vi.fn(() => bucket),
      },
    }
    const missionsRepository = {
      canManageAgent: vi.fn().mockResolvedValue(true),
      uploadAgentSkillAsset: vi.fn().mockResolvedValue({ publicUrl }),
      createAgentSkillResource: vi.fn().mockResolvedValue(skillResource),
    }
    const service = new AgentSkillManagementService(
      missionsRepository as never,
      { triggerAgentSkillsSync: vi.fn() } as never,
    )

    await expect(
      service.uploadSkillAsset(
        supabase as never,
        'user-1',
        'pixel',
        'research',
        { buffer: Buffer.from('pdf'), mimetype: 'application/pdf', originalname: 'file.pdf' },
        'Reference file',
      ),
    ).resolves.toEqual({ ...skillResource, url: publicUrl })

    expect(missionsRepository.createAgentSkillResource).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: 'user-1',
        agent_key: 'pixel',
        skill_key: 'research',
        file_path: 'assets/file.pdf',
        content: 'Reference file',
        content_type: 'application/pdf',
        storage_url: publicUrl,
      }),
    )
  })
})
