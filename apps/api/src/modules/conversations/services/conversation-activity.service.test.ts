import { describe, expect, it, vi } from 'vitest'
import { ConversationActivityService } from './conversation-activity.service'

describe('ConversationActivityService', () => {
  it('decorates conversation rows with per-user activity state', async () => {
    const repository = {
      listStates: vi
        .fn()
        .mockResolvedValue([
          { conversation_id: 'conversation-1', is_unread: true, needs_action: false },
        ]),
      markRead: vi.fn(),
    }
    const service = new ConversationActivityService(repository as never, {} as never)

    await expect(
      service.decorate({} as never, [
        { id: 'conversation-1', title: 'One' },
        { id: 'conversation-2', title: 'Two' },
      ]),
    ).resolves.toEqual([
      { id: 'conversation-1', title: 'One', is_unread: true, needs_action: false },
      { id: 'conversation-2', title: 'Two', is_unread: false, needs_action: false },
    ])
  })

  it('checks access before marking a conversation read', async () => {
    const repository = { listStates: vi.fn(), markRead: vi.fn().mockResolvedValue(undefined) }
    const permissions = { assertCanAccessConversation: vi.fn().mockResolvedValue('view') }
    const service = new ConversationActivityService(repository as never, permissions as never)

    await expect(
      service.markRead({} as never, 'user-1', 'conversation-1', 'org-1', 'viewer'),
    ).resolves.toEqual({ success: true })

    expect(permissions.assertCanAccessConversation).toHaveBeenCalledWith(
      {},
      'user-1',
      'viewer',
      'conversation-1',
      'view',
      'org-1',
    )
    expect(repository.markRead).toHaveBeenCalledWith({}, 'conversation-1', 'user-1')
  })
})
