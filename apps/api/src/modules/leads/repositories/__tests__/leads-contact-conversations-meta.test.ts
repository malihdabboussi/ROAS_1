import { describe, expect, it } from 'vitest'
import { TableSupabaseHarness } from '../../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../leads.repository'

describe('findContactConversations channel + agent metadata', () => {
  const repo = new LeadsRepository()

  it('annotates each conversation with its channel and agent name', async () => {
    const db = new TableSupabaseHarness({ agents_registry: [] })
    db.table('contacts').push({
      id: 'contact-1',
      user_id: 'user-1',
      org_id: 'org-1',
      email: null,
      contact_type: 'lead',
    })
    db.table('conversations').push(
      {
        id: 'conv-tg',
        user_id: 'user-1',
        org_id: 'org-1',
        contact_id: 'contact-1',
        agent_id: 'zara',
        title: 'Telegram Chat',
        status: 'active',
        metadata: { source: 'telegram', telegram_chat_id: '555' },
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-02T00:00:00.000Z',
      },
      {
        id: 'conv-widget',
        user_id: 'user-1',
        org_id: 'org-1',
        contact_id: 'contact-1',
        agent_id: 'max',
        title: 'Public chat',
        status: 'active',
        metadata: { public: true, visitor_id: 'v1' },
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-04T00:00:00.000Z',
      },
    )
    db.table('agents_registry').push(
      {
        agent_key: 'zara',
        name: 'Zara',
        image_url: 'https://cdn.example/zara.png',
        org_id: 'org-1',
        user_id: null,
      },
      {
        agent_key: 'max',
        name: 'Max',
        image_url: null,
        org_id: 'org-1',
        user_id: null,
      },
    )

    const result = await repo.findContactConversations(db.client, 'contact-1', 'org-1')
    const byId = new Map(result.linked.map((c: Record<string, unknown>) => [c.id, c]))

    expect(byId.get('conv-tg')).toMatchObject({
      channel: 'telegram',
      agent_name: 'Zara',
      agent_image_url: 'https://cdn.example/zara.png',
    })
    expect(byId.get('conv-widget')).toMatchObject({
      channel: 'widget',
      agent_name: 'Max',
      agent_image_url: null,
    })
  })
})
