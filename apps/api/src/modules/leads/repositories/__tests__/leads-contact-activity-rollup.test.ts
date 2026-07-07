import { describe, expect, it } from 'vitest'
import { TableSupabaseHarness } from '../../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../leads.repository'

describe('findContactActivity conversation events', () => {
  const repo = new LeadsRepository()

  function seedBase(db: TableSupabaseHarness) {
    db.table('contacts').push({
      id: 'contact-1',
      user_id: 'user-1',
      org_id: 'org-1',
      created_at: '2026-05-01T00:00:00.000Z',
    })
    db.table('conversations').push({
      id: 'conv-tg',
      user_id: 'user-1',
      org_id: 'org-1',
      contact_id: 'contact-1',
      agent_id: 'zara',
      title: 'Telegram Chat',
      status: 'active',
      metadata: { source: 'telegram', telegram_chat_id: '555' },
      created_at: '2026-06-01T09:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
    })
    db.table('agents_registry').push({
      agent_key: 'zara',
      name: 'Zara',
      org_id: 'org-1',
      user_id: null,
    })
  }

  it('emits conversation_started and per-day message activity rollups', async () => {
    const db = new TableSupabaseHarness({
      contact_funnel_memberships: [],
      contact_campaign_memberships: [],
      contact_notes: [],
      contact_activity: [],
      agents_registry: [],
    })
    seedBase(db)
    db.rpcHandlers.set('get_contact_conversation_message_rollup', () => [
      {
        conversation_id: 'conv-tg',
        day: '2026-06-01',
        message_count: 14,
        last_message_at: '2026-06-01T18:00:00.000Z',
      },
      {
        conversation_id: 'conv-tg',
        day: '2026-06-02',
        message_count: 3,
        last_message_at: '2026-06-02T08:00:00.000Z',
      },
    ])

    const { events } = await repo.findContactActivity(db.client, 'contact-1', 'org-1')

    const started = events.find((e) => e.event_type === 'conversation_started')
    expect(started).toBeTruthy()
    expect(started?.payload).toMatchObject({
      conversation_id: 'conv-tg',
      channel: 'telegram',
      agent_name: 'Zara',
      title: 'Telegram Chat',
    })
    expect(started?.created_at).toBe('2026-06-01T09:00:00.000Z')

    const rollups = events.filter((e) => e.event_type === 'conversation_message_activity')
    expect(rollups).toHaveLength(2)
    expect(rollups[0]?.payload).toMatchObject({
      conversation_id: 'conv-tg',
      channel: 'telegram',
      agent_name: 'Zara',
      message_count: 14,
    })
    // Events stay chronologically sorted overall
    const times = events.map((e) => new Date(e.created_at).getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('degrades gracefully when the rollup RPC is unavailable', async () => {
    const db = new TableSupabaseHarness({
      contact_funnel_memberships: [],
      contact_campaign_memberships: [],
      contact_notes: [],
      contact_activity: [],
      agents_registry: [],
    })
    seedBase(db)
    db.rpcHandlers.set('get_contact_conversation_message_rollup', () => {
      throw new Error('function does not exist')
    })

    const { events } = await repo.findContactActivity(db.client, 'contact-1', 'org-1')
    expect(events.some((e) => e.event_type === 'conversation_started')).toBe(true)
    expect(events.some((e) => e.event_type === 'conversation_message_activity')).toBe(false)
  })
})
