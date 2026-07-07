import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { ConversationPermissionsService } from '../conversation-permissions.service'

function createSupabaseMock(input: {
  conversation: Record<string, unknown> | null
  shares?: Array<Record<string, unknown>>
  shareUpsertResult?: Record<string, unknown>
}) {
  const operations: Array<Record<string, unknown>> = []
  return {
    operations,
    from(table: string) {
      const state: { table: string; filters: Record<string, unknown> } = { table, filters: {} }
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value
          return builder
        },
        is(column: string, value: unknown) {
          state.filters[column] = value
          return builder
        },
        or(_expr: string) {
          return builder
        },
        order(column: string, value: unknown) {
          operations.push({ type: 'order', table, column, value })
          return builder
        },
        in(column: string, values: unknown) {
          state.filters[column] = values
          return builder
        },
        upsert(row: Record<string, unknown>, options: Record<string, unknown>) {
          operations.push({ type: 'upsert', table, row, options })
          return builder
        },
        delete() {
          operations.push({ type: 'delete', table, filters: state.filters })
          return builder
        },
        maybeSingle() {
          if (state.table !== 'conversations') return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: input.conversation, error: null })
        },
        single() {
          if (state.table === 'conversation_shares') {
            return Promise.resolve({
              data:
                input.shareUpsertResult ??
                ({
                  id: 'share-1',
                  created_at: '2026-06-17T00:00:00.000Z',
                  ...(
                    operations.find((operation) => operation.type === 'upsert')?.row as Record<
                      string,
                      unknown
                    >
                  ),
                } as Record<string, unknown>),
              error: null,
            })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then(resolve: (value: unknown) => void) {
          if (state.table === 'conversation_shares') {
            return Promise.resolve({
              data: input.shares ?? [],
              error: null,
            }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

describe('ConversationPermissionsService', () => {
  it('gives the creator admin access', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-1', 'viewer', 'conv-1', 'org-1'),
    ).resolves.toBe('admin')
  })

  it('resolves explicit user edit shares', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
      shares: [
        {
          id: 'share-1',
          conversation_id: 'conv-1',
          org_id: 'org-1',
          entity_type: 'user',
          entity_id: 'user-2',
          level: 'edit',
        },
      ],
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-2', 'viewer', 'conv-1', 'org-1'),
    ).resolves.toBe('edit')
  })

  it('gives no baseline access to org admins (explicit shares only)', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-2', 'admin', 'conv-1', 'org-1'),
    ).resolves.toBeNull()
  })

  it('gives no baseline access to org viewers (explicit shares only)', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-2', 'viewer', 'conv-1', 'org-1'),
    ).resolves.toBeNull()
  })

  it('rejects any org member without a share', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    }) as never

    await expect(
      service.assertCanAccessConversation(supabase, 'user-2', 'viewer', 'conv-1', 'view', 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('lets the owner edit a personal-scope conversation from any org context', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: null },
    }) as never

    await expect(
      service.resolveEffectiveLevel(supabase, 'user-1', 'viewer', 'conv-1', 'org-1'),
    ).resolves.toBe('admin')

    await expect(
      service.assertCanAccessConversation(supabase, 'user-1', 'viewer', 'conv-1', 'edit', 'org-1'),
    ).resolves.toBe('admin')
  })

  it('still rejects a non-owner trying to access a personal-scope conversation from org context', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: null },
    }) as never

    await expect(
      service.assertCanAccessConversation(supabase, 'user-2', 'viewer', 'conv-1', 'view', 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('skips conversation_shares lookup when every row is owned by the requester', async () => {
    const service = new ConversationPermissionsService()
    let shareQueryCount = 0
    const supabase = {
      from(table: string) {
        const state: { table: string; filters: Record<string, unknown> } = { table, filters: {} }
        const builder = {
          select() {
            return builder
          },
          in(column: string, values: unknown) {
            state.filters[column] = values
            return builder
          },
          then(resolve: (value: unknown) => void) {
            if (state.table === 'conversation_shares') {
              shareQueryCount += 1
              return Promise.resolve({ data: [], error: null }).then(resolve)
            }
            return Promise.resolve({ data: null, error: null }).then(resolve)
          },
        }
        return builder
      },
    } as never

    const rows = Array.from({ length: 120 }, (_, index) => ({
      id: `conv-${index}`,
      org_id: null,
      user_id: 'user-1',
    }))

    const levels = await service.resolveEffectiveLevelsForRows(
      supabase,
      rows,
      'user-1',
      'viewer',
      null,
    )

    expect(shareQueryCount).toBe(0)
    expect(levels.size).toBe(120)
    expect([...levels.values()].every((level) => level === 'admin')).toBe(true)
  })

  it('batches conversation_shares lookup for foreign-owned rows', async () => {
    const service = new ConversationPermissionsService()
    const shareQuerySizes: number[] = []
    const supabase = {
      from(table: string) {
        const state: { table: string; filters: Record<string, unknown> } = { table, filters: {} }
        const builder = {
          select() {
            return builder
          },
          in(column: string, values: unknown) {
            state.filters[column] = values
            return builder
          },
          then(resolve: (value: unknown) => void) {
            if (state.table === 'conversation_shares') {
              const ids = state.filters.conversation_id
              shareQuerySizes.push(Array.isArray(ids) ? ids.length : 0)
              return Promise.resolve({ data: [], error: null }).then(resolve)
            }
            return Promise.resolve({ data: null, error: null }).then(resolve)
          },
        }
        return builder
      },
    } as never

    const rows = Array.from({ length: 120 }, (_, index) => ({
      id: `conv-${index}`,
      org_id: 'org-1',
      user_id: 'user-2',
    }))

    await service.resolveEffectiveLevelsForRows(supabase, rows, 'user-1', 'viewer', 'org-1')

    expect(shareQuerySizes).toEqual([50, 50, 20])
  })

  it('lists conversation shares in created order for the active org scope', async () => {
    const service = new ConversationPermissionsService()
    const shares = [
      {
        id: 'share-1',
        conversation_id: 'conv-1',
        org_id: 'org-1',
        entity_type: 'user',
        entity_id: 'user-2',
        level: 'view',
        created_by: 'user-1',
        created_at: '2026-06-17T00:00:00.000Z',
      },
    ]
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
      shares,
    })

    await expect(
      service.listConversationShares(supabase as never, 'conv-1', 'org-1'),
    ).resolves.toEqual(shares)

    expect(supabase.operations).toContainEqual({
      type: 'order',
      table: 'conversation_shares',
      column: 'created_at',
      value: { ascending: true },
    })
  })

  it('upserts shares with the conversation org and requesting creator', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    })

    await expect(
      service.upsertConversationShare(
        supabase as never,
        'user-1',
        'conv-1',
        { entity_type: 'user', entity_id: 'user-2', level: 'edit' },
        'org-1',
      ),
    ).resolves.toMatchObject({
      conversation_id: 'conv-1',
      org_id: 'org-1',
      entity_type: 'user',
      entity_id: 'user-2',
      level: 'edit',
      created_by: 'user-1',
    })

    expect(supabase.operations).toContainEqual({
      type: 'upsert',
      table: 'conversation_shares',
      row: {
        conversation_id: 'conv-1',
        org_id: 'org-1',
        entity_type: 'user',
        entity_id: 'user-2',
        level: 'edit',
        created_by: 'user-1',
      },
      options: { onConflict: 'conversation_id,entity_type,entity_id' },
    })
  })

  it('deletes shares only inside the requested conversation and org scope', async () => {
    const service = new ConversationPermissionsService()
    const supabase = createSupabaseMock({
      conversation: { id: 'conv-1', user_id: 'user-1', org_id: 'org-1' },
    })

    await expect(
      service.deleteConversationShare(supabase as never, 'conv-1', 'share-1', 'org-1'),
    ).resolves.toBeUndefined()

    expect(supabase.operations).toContainEqual({
      type: 'delete',
      table: 'conversation_shares',
      filters: { id: 'share-1', conversation_id: 'conv-1', org_id: 'org-1' },
    })
  })
})
