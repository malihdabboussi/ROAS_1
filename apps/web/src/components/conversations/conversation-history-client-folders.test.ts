import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import {
  buildChatHistoryClientFolderMaps,
  chatHistoryClientFolderLabel,
} from './conversation-history-client-folders'

function campaign(overrides: Partial<Campaign> & { id: string; name: string }): Campaign {
  return {
    user_id: 'user-1',
    campaign_type: 'default',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
    ...overrides,
  }
}

function program(overrides: Partial<Program> & { id: string; name: string }): Program {
  return {
    org_id: 'org-1',
    user_id: null,
    slug: overrides.id,
    system_kind: null,
    icon: null,
    icon_color: null,
    sort_order: 0,
    config: {},
    visibility: 'workspace',
    created_by: null,
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  }
}

describe('chat history client folders', () => {
  it('names a General client campaign after its specific parent', () => {
    expect(
      chatHistoryClientFolderLabel(
        campaign({ id: 'above-it', name: 'General', program_id: 'prog-above' }),
        [program({ id: 'prog-above', name: 'Above It' })],
      ),
    ).toBe('Above It')
  })

  it('maps Clients-program campaigns into folders and skips org General', () => {
    const maps = buildChatHistoryClientFolderMaps(
      [
        campaign({
          id: 'org-general',
          name: 'General',
          config: { system_kind: 'general' },
        }),
        campaign({
          id: 'above-it',
          name: 'Above It',
          program_id: 'prog-clients',
        }),
        campaign({ id: 'ops', name: 'ROAS Ops', program_id: 'prog-ops' }),
      ],
      [
        program({ id: 'prog-clients', name: 'Clients', system_kind: 'clients' }),
        program({ id: 'prog-ops', name: 'ROAS Ops', system_kind: 'roas_ops' }),
      ],
    )

    expect(maps.clientCampaignIds).toEqual(['above-it'])
    expect(maps.clientNameById).toEqual({ 'above-it': 'Above It' })
  })
})
