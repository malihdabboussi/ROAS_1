import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableSupabaseHarness, type Row } from '../../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../../repositories/leads.repository'
import { ContactIdentifierService } from '../contact-identifier.service'
import { LeadsService } from '../leads.service'

function createService(db: TableSupabaseHarness) {
  const repo = new LeadsRepository()
  vi.spyOn(repo, 'createLeadSecure').mockResolvedValue('lead-1')
  const service = new LeadsService(repo, {} as never, {} as never, new ContactIdentifierService())
  vi.spyOn(service as any, 'createServiceClient').mockReturnValue(db.client)
  return { service, repo }
}

function seedFunnel(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: 'funnel-1',
    user_id: 'user-1',
    org_id: 'org-1',
    campaign_id: 'campaign-1',
    tag_ids: ['vip'],
    name: 'Launch Funnel',
    ...overrides,
  }
  db.table('funnels').push(row)
  return row
}

function seedSenderIdentity(db: TableSupabaseHarness): void {
  db.table('email_sender_identities').push({
    id: 'sender-1',
    domain_id: 'domain-1',
    user_id: 'user-1',
    org_id: 'org-1',
    is_verified: true,
    is_default: true,
  })
}

describe('LeadsService.ingestLead contact flow', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an owner-scoped contact through the identifier service with funnel channel + detail', async () => {
    const db = new TableSupabaseHarness({
      funnels: [],
      email_sender_identities: [],
      campaign_workflow_edges: [],
      contact_funnel_memberships: [],
    })
    seedFunnel(db)
    seedSenderIdentity(db)
    const { service } = createService(db)

    await service.ingestLead({
      funnelId: 'funnel-1',
      email: 'joe@x.com',
      name: 'Joe Bell',
      phone: '+1 555 0100',
    })

    expect(db.table('contacts')).toHaveLength(1)
    const [contact] = db.table('contacts')
    expect(contact).toMatchObject({
      user_id: 'user-1',
      org_id: 'org-1',
      email: 'joe@x.com',
      first_name: 'Joe',
      last_name: 'Bell',
      contact_source: 'funnel',
      contact_source_detail: 'Launch Funnel',
    })
    expect(contact.tags).toContain('vip')

    const identifiers = db.table('contact_identifiers')
    expect(identifiers).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        owner_key: 'org-1',
        kind: 'email',
        value: 'joe@x.com',
      }),
    )
    expect(identifiers).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        owner_key: 'org-1',
        kind: 'phone',
        value: '+15550100',
      }),
    )

    expect(db.table('contact_funnel_memberships')).toContainEqual(
      expect.objectContaining({ contact_id: contact.id, funnel_id: 'funnel-1' }),
    )
    expect(db.table('contact_campaign_memberships')).toContainEqual(
      expect.objectContaining({ contact_id: contact.id, campaign_id: 'campaign-1' }),
    )
  })

  it('reuses the contact and memberships on a second submit (no duplicates)', async () => {
    const db = new TableSupabaseHarness({
      funnels: [],
      email_sender_identities: [],
      campaign_workflow_edges: [],
      contact_funnel_memberships: [],
    })
    seedFunnel(db)
    seedSenderIdentity(db)
    const { service } = createService(db)

    await service.ingestLead({ funnelId: 'funnel-1', email: 'joe@x.com', name: 'Joe Bell' })
    await service.ingestLead({ funnelId: 'funnel-1', email: 'joe@x.com', name: 'Joe Bell' })

    expect(db.table('contacts')).toHaveLength(1)
    expect(db.table('contact_identifiers').filter((row) => row.kind === 'email')).toHaveLength(1)
    expect(db.table('contact_funnel_memberships')).toHaveLength(1)
    expect(db.table('contact_campaign_memberships')).toHaveLength(1)
  })

  it('succeeds without a sender identity when the funnel has no email sequences wired', async () => {
    const db = new TableSupabaseHarness({
      funnels: [],
      email_sender_identities: [],
      campaign_workflow_edges: [],
      contact_funnel_memberships: [],
    })
    seedFunnel(db)
    // No sender identity seeded — must not matter when there are no sequence edges.
    const { service } = createService(db)

    await service.ingestLead({ funnelId: 'funnel-1', email: 'joe@x.com', name: 'Joe Bell' })

    expect(db.table('contacts')).toHaveLength(1)
    expect(db.table('contact_campaign_memberships')).toHaveLength(1)
  })

  it('keeps existing contact names when a repeat submit omits the name', async () => {
    const db = new TableSupabaseHarness({
      funnels: [],
      email_sender_identities: [],
      campaign_workflow_edges: [],
      contact_funnel_memberships: [],
    })
    seedFunnel(db)
    seedSenderIdentity(db)
    const { service } = createService(db)

    await service.ingestLead({ funnelId: 'funnel-1', email: 'joe@x.com', name: 'Joe Bell' })
    await service.ingestLead({ funnelId: 'funnel-1', email: 'joe@x.com' })

    const [contact] = db.table('contacts')
    expect(contact.first_name).toBe('Joe')
    expect(contact.last_name).toBe('Bell')
  })
})

describe('LeadsService.resolveContactForChannel (widget and other channels)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a widget contact with campaign membership when an email is given', async () => {
    const db = new TableSupabaseHarness()
    const { service } = createService(db)

    const result = await service.resolveContactForChannel({
      userId: 'user-1',
      orgId: 'org-1',
      email: 'visitor@x.com',
      firstName: 'Vis',
      lastName: 'Itor',
      channel: 'widget',
      campaignId: 'campaign-1',
      agentKey: 'zara',
    })

    expect(result.contact_id).toBeTruthy()
    const [contact] = db.table('contacts')
    expect(contact).toMatchObject({
      user_id: 'user-1',
      org_id: 'org-1',
      email: 'visitor@x.com',
      contact_source: 'widget',
    })
    expect(db.table('contact_identifiers')).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        owner_key: 'org-1',
        kind: 'email',
        value: 'visitor@x.com',
      }),
    )
    expect(db.table('contact_campaign_memberships')).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        campaign_id: 'campaign-1',
        metadata: expect.objectContaining({ source: 'widget', agent_key: 'zara' }),
      }),
    )
  })

  it('returns null without creating anything when no contactable identifier is given', async () => {
    const db = new TableSupabaseHarness()
    const { service } = createService(db)

    const result = await service.resolveContactForChannel({
      userId: 'user-1',
      orgId: 'org-1',
      channel: 'widget',
      campaignId: 'campaign-1',
    })

    expect(result.contact_id).toBeNull()
    expect(db.table('contacts')).toHaveLength(0)
    expect(db.table('contact_campaign_memberships')).toHaveLength(0)
  })

  it('backfills missing names on an existing contact instead of duplicating it', async () => {
    const db = new TableSupabaseHarness()
    db.table('contacts').push({
      id: 'contact-1',
      user_id: 'user-1',
      org_id: 'org-1',
      email: 'visitor@x.com',
      first_name: null,
      last_name: null,
      contact_type: 'unknown',
      tags: [],
    })
    const { service } = createService(db)

    const result = await service.resolveContactForChannel({
      userId: 'user-1',
      orgId: 'org-1',
      email: 'visitor@x.com',
      firstName: 'Vis',
      lastName: 'Itor',
      channel: 'widget',
    })

    expect(result.contact_id).toBe('contact-1')
    expect(db.table('contacts')).toHaveLength(1)
    expect(db.table('contacts')[0]).toMatchObject({ first_name: 'Vis', last_name: 'Itor' })
  })
})
