import { describe, expect, it, vi } from 'vitest'
import { HiggsfieldRepository } from './higgsfield.repository'

function queryResult(data: unknown) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    single: vi.fn(async () => ({ data, error: null })),
    update: vi.fn(() => query),
  }
  return query
}

describe('HiggsfieldRepository', () => {
  it('uses an organization-scoped vault label so a personal credential cannot conflict', async () => {
    const projectQuery = queryResult({ id: 'project-1' })
    const vaultLookup = queryResult(null)
    const vaultInsert = queryResult({ id: 'secret-1' })
    const serverLookup = queryResult({ id: 'server-1' })
    const serverUpdate = queryResult(null)
    const insertedVaultPayloads: Array<Record<string, unknown>> = []
    const vaultTable = {
      select: vi.fn(() => vaultLookup),
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertedVaultPayloads.push(payload)
        return vaultInsert
      }),
    }
    const serverTable = {
      select: vi.fn(() => serverLookup),
      update: vi.fn(() => serverUpdate),
    }
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return { select: vi.fn(() => projectQuery) }
        if (table === 'vault_secrets') return vaultTable
        if (table === 'project_mcp_servers') return serverTable
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const repository = new HiggsfieldRepository({ client: admin } as never)

    await repository.saveConnection({
      scope: { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' } as never,
      tokenBundle: '{"accessToken":"token"}',
    })

    expect(vaultLookup.eq).toHaveBeenCalledWith('label', 'higgsfield:oauth:org:org-1')
    expect(insertedVaultPayloads).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        provider: 'mcp',
        label: 'higgsfield:oauth:org:org-1',
      }),
    ])
  })
})
