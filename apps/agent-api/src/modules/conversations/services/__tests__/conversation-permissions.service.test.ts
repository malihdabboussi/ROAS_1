import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { ConversationPermissionsService } from '../conversation-permissions.service'

function createSupabaseMock(input: {
  conversation: Record<string, unknown> | null
  shares?: Array<Record<string, unknown>>
}) {
  return {
    from(table: string) {
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        is() {
          return builder
        },
        maybeSingle() {
          if (table !== 'conversations') return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: input.conversation, error: null })
        },
        then(resolve: (value: unknown) => void) {
          if (table === 'conversation_shares') {
            return Promise.resolve({ data: input.shares ?? [], error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

describe('Agent API ConversationPermissionsService', () => {
  it('does not grant org owners baseline access without an explicit share', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-2', 'owner', 'conv-1', 'org-1'),
    ).resolves.toBeNull()
  })

  it('allows explicit user edit shares', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
      shares: [{ entity_type: 'user', entity_id: 'user-2', org_id: 'org-1', level: 'edit' }],
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-2', 'viewer', 'conv-1', 'org-1'),
    ).resolves.toBe('edit')
  })

  it('rejects org admins without an explicit share', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.assertCanAccessConversation(supabase, 'user-2', 'admin', 'conv-1', 'view', 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
