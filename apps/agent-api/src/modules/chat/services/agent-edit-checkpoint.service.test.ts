import { describe, expect, it, vi } from 'vitest'
import { AgentEditCheckpointService } from './agent-edit-checkpoint.service'
import type { AgentCheckpointSnapshot } from '../../shared/services/request-context.service'

function makeCheckpointRepository() {
  return {
    hasAnyCheckpoint: vi.fn(async () => false),
    hasDuplicateMessageCheckpoint: vi.fn(async () => false),
    insertCheckpoint: vi.fn(async () => null),
    listAgentDefinitions: vi.fn(async () => ({
      data: [{ file_name: 'SOUL.md', content: 'after' }],
      error: null,
    })),
    listAgentSkills: vi.fn(async () => ({
      data: [
        {
          skill_key: 'research',
          name: 'Research',
          description: 'Look things up',
          markdown_content: 'Use careful research',
          is_enabled: null,
        },
      ],
      error: null,
    })),
  }
}

describe('AgentEditCheckpointService', () => {
  it('captures a baseline checkpoint and current turn checkpoint for changed managed agents', async () => {
    const preSnapshot: AgentCheckpointSnapshot = {
      definitions: [{ file_name: 'SOUL.md', content: 'before' }],
      skills: [],
    }
    const client = {}
    const repository = makeCheckpointRepository()
    const service = new AgentEditCheckpointService({ client } as never, repository as never)

    await service.finalizeTurn({
      userId: 'user-1',
      orgId: null,
      conversationId: 'conversation-1',
      messageId: 'message-1',
      mutations: [
        {
          agentKey: 'copywriter',
          summaries: [' Updated voice ', 'Updated voice', 'Added skill'],
          preSnapshot,
        },
      ],
    })

    expect(repository.hasAnyCheckpoint).toHaveBeenCalledWith(client, {
      userId: 'user-1',
      orgId: null,
      agentKey: 'copywriter',
    })
    expect(repository.insertCheckpoint).toHaveBeenCalledTimes(2)
    expect(repository.insertCheckpoint).toHaveBeenNthCalledWith(
      1,
      client,
      {
        userId: 'user-1',
        orgId: null,
        agentKey: 'copywriter',
        conversationId: 'conversation-1',
        messageId: null,
        kind: 'baseline',
        summary: 'Original version',
        snapshot: preSnapshot,
      },
    )
    expect(repository.insertCheckpoint).toHaveBeenNthCalledWith(
      2,
      client,
      {
        userId: 'user-1',
        orgId: null,
        agentKey: 'copywriter',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        kind: 'auto_turn',
        summary: 'Updated voice · Added skill',
        snapshot: {
          definitions: [{ file_name: 'SOUL.md', content: 'after' }],
          skills: [
            {
              skill_key: 'research',
              name: 'Research',
              description: 'Look things up',
              markdown_content: 'Use careful research',
              is_enabled: true,
            },
          ],
        },
      },
    )
  })

  it('skips system agent checkpoint mutations', async () => {
    const repository = makeCheckpointRepository()
    const service = new AgentEditCheckpointService({ client: {} } as never, repository as never)

    await service.finalizeTurn({
      userId: 'user-1',
      orgId: null,
      conversationId: 'conversation-1',
      messageId: 'message-1',
      mutations: [
        {
          agentKey: 'vibey',
          summaries: ['Changed'],
          preSnapshot: null,
        },
      ],
    })

    expect(repository.hasAnyCheckpoint).not.toHaveBeenCalled()
    expect(repository.insertCheckpoint).not.toHaveBeenCalled()
  })
})
