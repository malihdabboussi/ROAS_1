import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AgentCheckpointsService } from './agent-checkpoints.service'

const supabase = { from: vi.fn() } as unknown as SupabaseClient

describe('AgentCheckpointsService learning loop checkpoints', () => {
  it('creates a checkpoint from the current agent snapshot before approved learning-loop writes', async () => {
    const repository = {
      createSnapshot: vi.fn(async () => ({
        definitions: [{ file_name: 'ROLE.md', content: '# Role' }],
        skills: [
          {
            skill_key: 'proposal-doc-builder',
            name: 'Proposal Doc Builder',
            description: 'Use for proposal docs.',
            markdown_content: '# Skill',
            is_enabled: true,
          },
        ],
        resources: [
          {
            skill_key: 'proposal-doc-builder',
            file_path: 'references/example.md',
            content: '# Example',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
      })),
      insertLearningLoopCheckpoint: vi.fn(async () => ({ id: 'checkpoint-1' })),
    }
    const service = new AgentCheckpointsService(repository as never)

    const result = await service.createLearningLoopCheckpoint(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'Agent Learning Loop: before applying Proposal Doc Builder',
    )

    expect(repository.createSnapshot).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
    )
    expect(repository.insertLearningLoopCheckpoint).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'designer',
      'Agent Learning Loop: before applying Proposal Doc Builder',
      {
        definitions: [{ file_name: 'ROLE.md', content: '# Role' }],
        skills: [
          {
            skill_key: 'proposal-doc-builder',
            name: 'Proposal Doc Builder',
            description: 'Use for proposal docs.',
            markdown_content: '# Skill',
            is_enabled: true,
          },
        ],
        resources: [
          {
            skill_key: 'proposal-doc-builder',
            file_path: 'references/example.md',
            content: '# Example',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
      },
    )
    expect(result).toEqual({ id: 'checkpoint-1' })
  })

  it('does not create learning-loop checkpoints for system agents', async () => {
    const repository = {
      createSnapshot: vi.fn(),
      insertLearningLoopCheckpoint: vi.fn(),
    }
    const service = new AgentCheckpointsService(repository as never)

    await expect(
      service.createLearningLoopCheckpoint(
        supabase,
        'user-1',
        'org-1',
        'hr',
        'Agent Learning Loop: blocked',
      ),
    ).rejects.toThrow('System agents cannot use checkpoints')
    expect(repository.createSnapshot).not.toHaveBeenCalled()
  })
})
