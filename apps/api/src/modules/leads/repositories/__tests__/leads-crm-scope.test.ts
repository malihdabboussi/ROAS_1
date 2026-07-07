import { describe, expect, it } from 'vitest'
import { TableSupabaseHarness, type Row } from '../../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../leads.repository'

function seedContact(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: overrides.id ?? db.nextId('contacts'),
    user_id: 'user-1',
    org_id: 'org-1',
    email: `${overrides.id ?? 'x'}@x.com`,
    first_name: null,
    last_name: null,
    phone: null,
    tags: [],
    contact_type: 'lead',
    contact_source: 'funnel',
    contact_source_detail: null,
    is_archived: false,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
  db.table('contacts').push(row)
  return row
}

describe('findCrmContacts scope', () => {
  const repo = new LeadsRepository()

  it('returns all org contacts when no campaignId is given, and only members when scoped', async () => {
    const db = new TableSupabaseHarness({
      contact_funnel_memberships: [],
      contact_notes: [],
    })
    // Campaign scoping uses a PostgREST `!inner` embed; the harness models the
    // embed as a nested array on the contact row.
    seedContact(db, { id: 'contact-1', contact_campaign_memberships: [] })
    seedContact(db, {
      id: 'contact-2',
      contact_campaign_memberships: [{ campaign_id: 'campaign-1' }],
    })
    seedContact(db, { id: 'contact-3', contact_campaign_memberships: [] })

    const all = await repo.findCrmContacts(db.client, { orgId: 'org-1' })
    expect(all.total).toBe(3)
    expect(all.contacts.map((c: Row) => c.id).sort()).toEqual([
      'contact-1',
      'contact-2',
      'contact-3',
    ])

    const scoped = await repo.findCrmContacts(db.client, {
      orgId: 'org-1',
      campaignId: 'campaign-1',
    })
    expect(scoped.total).toBe(1)
    expect(scoped.contacts[0]?.id).toBe('contact-2')
  })

  it('exposes contact_source_detail on returned rows', async () => {
    const db = new TableSupabaseHarness({
      contact_funnel_memberships: [],
      contact_notes: [],
    })
    seedContact(db, { id: 'contact-1', contact_source: 'import', contact_source_detail: 'csv' })

    const result = await repo.findCrmContacts(db.client, { orgId: 'org-1' })
    expect(result.contacts[0]).toMatchObject({
      contact_source: 'import',
      contact_source_detail: 'csv',
    })
  })
})
