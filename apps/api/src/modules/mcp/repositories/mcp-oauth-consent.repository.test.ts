import { describe, expect, it, vi } from 'vitest'
import { McpOAuthConsentRepository } from './mcp-oauth-consent.repository'

describe('McpOAuthConsentRepository', () => {
  it('resolves personal account previews without a database call', async () => {
    const client = { from: vi.fn() }
    const repository = new McpOAuthConsentRepository({ client } as never)

    await expect(repository.resolveAccountPreview(null)).resolves.toEqual({
      type: 'personal',
      id: null,
      name: 'Personal account',
      avatar_url: null,
    })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('lists locked organization accounts for active members', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        role: 'admin',
        organizations: { id: 'org-1', name: 'Org One', avatar_url: null },
      },
      error: null,
    })
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    }
    const client = { from: vi.fn(() => query) }
    const repository = new McpOAuthConsentRepository({ client } as never)

    await expect(repository.listSelectableAccounts('user-1', 'org-1')).resolves.toEqual([
      {
        type: 'organization',
        id: 'org-1',
        name: 'Org One',
        avatar_url: null,
        role: 'admin',
      },
    ])
    expect(client.from).toHaveBeenCalledWith('org_members')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
  })
})
