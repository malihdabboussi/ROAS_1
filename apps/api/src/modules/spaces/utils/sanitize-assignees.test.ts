import { describe, expect, it, vi } from 'vitest'
import { sanitizeAssigneesForWrite } from './sanitize-assignees'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const VALID_MEMBER_ID = '22222222-2222-4222-8222-222222222222'
const STALE_MEMBER_ID = '33333333-3333-4333-8333-333333333333'

function orgMembersSupabase(activeUserIds: string[]) {
  const repository = {
    findActiveOrgMemberUserIds: vi.fn().mockResolvedValue(activeUserIds),
  }
  const supabase = {
    from: vi.fn(),
  }
  return { repository, supabase }
}

describe('sanitizeAssigneesForWrite', () => {
  it('keeps active org human assignees and agents while stripping stale humans', async () => {
    const { repository, supabase } = orgMembersSupabase([VALID_MEMBER_ID])
    const fields = {
      assignees: [
        { type: 'human' as const, id: VALID_MEMBER_ID },
        { type: 'human' as const, id: STALE_MEMBER_ID },
        { type: 'agent' as const, id: 'agent_atlas' },
      ],
      assignee_type: 'human' as const,
      assignee_id: VALID_MEMBER_ID,
    }

    await sanitizeAssigneesForWrite(
      repository as never,
      supabase as never,
      USER_ID,
      'org-1',
      fields,
    )

    expect(repository.findActiveOrgMemberUserIds).toHaveBeenCalledWith(supabase, 'org-1', [
      VALID_MEMBER_ID,
      STALE_MEMBER_ID,
    ])
    expect(supabase.from).not.toHaveBeenCalled()
    expect(fields).toEqual({
      assignees: [
        { type: 'human', id: VALID_MEMBER_ID },
        { type: 'agent', id: 'agent_atlas' },
      ],
      assignee_type: 'human',
      assignee_id: VALID_MEMBER_ID,
    })
  })

  it('uses the caller as the only valid personal-context human assignee', async () => {
    const { repository, supabase } = orgMembersSupabase([])
    const fields = {
      assignees: [
        { type: 'human' as const, id: STALE_MEMBER_ID },
        { type: 'agent' as const, id: 'agent_atlas' },
        { type: 'human' as const, id: USER_ID },
      ],
      assignee_type: 'human' as const,
      assignee_id: STALE_MEMBER_ID,
    }

    await sanitizeAssigneesForWrite(repository as never, supabase as never, USER_ID, null, fields)

    expect(repository.findActiveOrgMemberUserIds).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
    expect(fields).toEqual({
      assignees: [
        { type: 'agent', id: 'agent_atlas' },
        { type: 'human', id: USER_ID },
      ],
      assignee_type: 'agent',
      assignee_id: 'agent_atlas',
    })
  })
})
