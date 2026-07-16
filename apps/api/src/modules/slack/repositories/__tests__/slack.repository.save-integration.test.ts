import { describe, expect, it, vi } from 'vitest'
import { SlackRepository } from '../slack.repository'

describe('SlackRepository.saveIntegration', () => {
  it('inserts personal scope_mode when orgId is null', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const is = vi.fn(() => ({ maybeSingle }))
    const eq2 = vi.fn(() => ({ is, eq: eq2, maybeSingle }))
    const select = vi.fn(() => ({ eq: eq2 }))
    const from = vi.fn((table: string) => {
      if (table !== 'user_integrations') throw new Error(`unexpected table ${table}`)
      return {
        select,
        insert: (row: Record<string, unknown>) => {
          insert(row)
          return Promise.resolve({ error: null })
        },
      }
    })
    const supabase = { from } as never
    const repo = new SlackRepository()

    await repo.saveIntegration(
      supabase,
      'user-1',
      'xoxb-token',
      { team_id: 'T1', team_name: 'ROAS' },
      null,
    )

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        integration_id: 'slack',
        provider: 'slack',
        access_token: 'xoxb-token',
        status: 'connected',
        org_id: null,
        scope_mode: 'personal',
        connection_label: 'ROAS',
      }),
    )
  })

  it('inserts org_shared scope_mode when orgId is set', async () => {
    const insert = vi.fn()
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ eq, maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({
      select,
      insert: (row: Record<string, unknown>) => {
        insert(row)
        return Promise.resolve({ error: null })
      },
    }))
    const supabase = { from } as never
    const repo = new SlackRepository()

    await repo.saveIntegration(supabase, 'user-1', 'xoxb-token', { team_id: 'T1' }, 'org-1')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        scope_mode: 'org_shared',
      }),
    )
  })
})
