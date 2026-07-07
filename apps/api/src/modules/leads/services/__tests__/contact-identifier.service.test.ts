import { describe, expect, it } from 'vitest'
import { TableSupabaseHarness, type Row } from '../../../../test/utils/table-supabase-harness'
import {
  CONTACT_CHANNELS,
  ContactIdentifierService,
  isContactChannel,
  normalizeLegacyContactSource,
} from '../contact-identifier.service'

function seedContact(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: overrides.id ?? db.nextId('contacts'),
    user_id: overrides.user_id ?? 'user-1',
    org_id: overrides.org_id ?? null,
    email: overrides.email ?? null,
    first_name: null,
    last_name: null,
    contact_type: 'unknown',
    tags: [],
    ...overrides,
  }
  db.table('contacts').push(row)
  return row
}

function seedIdentifier(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: overrides.id ?? db.nextId('contact_identifiers'),
    contact_id: overrides.contact_id ?? 'contact-1',
    owner_key: overrides.owner_key ?? 'user-1',
    kind: overrides.kind ?? 'email',
    value: overrides.value ?? 'joe@x.com',
    confidence: 1,
    source: 'system',
    ...overrides,
  }
  db.table('contact_identifiers').push(row)
  return row
}

describe('ContactIdentifierService tenant scoping', () => {
  const service = new ContactIdentifierService()

  it('never re-points another tenant identifier: same email in two orgs yields two contacts', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, { id: 'contact-a', user_id: 'user-a', org_id: 'org-a', email: 'joe@x.com' })
    seedIdentifier(db, { contact_id: 'contact-a', owner_key: 'org-a' })

    const contactB = await service.findOrCreateContact(db.client, {
      userId: 'user-b',
      orgId: 'org-b',
      kind: 'email',
      value: 'joe@x.com',
      channel: 'form',
    })

    expect(contactB.id).not.toBe('contact-a')
    expect(contactB.org_id).toBe('org-b')

    const emailIdentifiers = db
      .table('contact_identifiers')
      .filter((row) => row.kind === 'email' && row.value === 'joe@x.com')
    expect(emailIdentifiers).toHaveLength(2)
    expect(emailIdentifiers.find((row) => row.owner_key === 'org-a')?.contact_id).toBe('contact-a')
    expect(emailIdentifiers.find((row) => row.owner_key === 'org-b')?.contact_id).toBe(contactB.id)
  })

  it('resolveByKind only matches identifiers within the caller owner scope', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, { id: 'contact-a', user_id: 'user-a', org_id: 'org-a', email: 'joe@x.com' })
    seedIdentifier(db, { contact_id: 'contact-a', owner_key: 'org-a' })

    const sameOrg = await service.resolveByKind(
      db.client,
      { userId: 'user-a', orgId: 'org-a' },
      'email',
      'joe@x.com',
    )
    expect(sameOrg?.id).toBe('contact-a')

    const otherOrg = await service.resolveByKind(
      db.client,
      { userId: 'user-b', orgId: 'org-b' },
      'email',
      'joe@x.com',
    )
    expect(otherOrg).toBeNull()
  })

  it('uses the user id as owner scope for personal (no-org) accounts', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, { id: 'contact-p', user_id: 'user-p', org_id: null, email: 'p@x.com' })
    seedIdentifier(db, {
      contact_id: 'contact-p',
      owner_key: 'user-p',
      value: 'p@x.com',
    })

    const resolved = await service.resolveByKind(
      db.client,
      { userId: 'user-p', orgId: null },
      'email',
      'p@x.com',
    )
    expect(resolved?.id).toBe('contact-p')

    const otherUser = await service.resolveByKind(
      db.client,
      { userId: 'user-q', orgId: null },
      'email',
      'p@x.com',
    )
    expect(otherUser).toBeNull()
  })

  it('attachIdentifier stamps owner_key and upserts per (owner_key, kind, value)', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, { id: 'contact-a', user_id: 'user-a', org_id: 'org-a' })
    seedContact(db, { id: 'contact-b', user_id: 'user-b', org_id: 'org-b' })

    await service.attachIdentifier(db.client, {
      contactId: 'contact-a',
      owner: { userId: 'user-a', orgId: 'org-a' },
      kind: 'telegram_chat_id',
      value: '555',
    })
    await service.attachIdentifier(db.client, {
      contactId: 'contact-a',
      owner: { userId: 'user-a', orgId: 'org-a' },
      kind: 'telegram_chat_id',
      value: '555',
    })
    await service.attachIdentifier(db.client, {
      contactId: 'contact-b',
      owner: { userId: 'user-b', orgId: 'org-b' },
      kind: 'telegram_chat_id',
      value: '555',
    })

    const rows = db
      .table('contact_identifiers')
      .filter((row) => row.kind === 'telegram_chat_id' && row.value === '555')
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.owner_key).sort()).toEqual(['org-a', 'org-b'])
    expect(rows.find((row) => row.owner_key === 'org-a')?.contact_id).toBe('contact-a')
    expect(rows.find((row) => row.owner_key === 'org-b')?.contact_id).toBe('contact-b')
  })

  it('stamps contact_source from the channel and contact_source_detail from detail', async () => {
    const db = new TableSupabaseHarness()

    const contact = await service.findOrCreateContact(db.client, {
      userId: 'user-1',
      orgId: 'org-1',
      kind: 'email',
      value: 'new@x.com',
      channel: 'form',
      detail: 'Contact form',
    })

    const row = db.table('contacts').find((r) => r.id === contact.id)
    expect(row).toMatchObject({
      contact_source: 'form',
      contact_source_detail: 'Contact form',
      org_id: 'org-1',
    })
    expect(row?.contact_source).not.toBe('identifier')
  })

  it('reuses an existing org contact by email regardless of which member created it', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, { id: 'contact-1', user_id: 'user-1', org_id: 'org-1', email: 'joe@x.com' })

    const contact = await service.findOrCreateContact(db.client, {
      userId: 'user-2',
      orgId: 'org-1',
      kind: 'telegram_chat_id',
      value: '999',
      email: 'joe@x.com',
      channel: 'telegram',
    })

    expect(contact.id).toBe('contact-1')
    expect(db.table('contacts')).toHaveLength(1)
    expect(db.table('contact_identifiers')).toContainEqual(
      expect.objectContaining({
        contact_id: 'contact-1',
        owner_key: 'org-1',
        kind: 'telegram_chat_id',
        value: '999',
      }),
    )
  })
})

describe('contact channel enum', () => {
  it('contains exactly the eight canonical channels', () => {
    expect([...CONTACT_CHANNELS].sort()).toEqual(
      [
        'automation',
        'form',
        'funnel',
        'import',
        'integration',
        'manual',
        'telegram',
        'widget',
      ].sort(),
    )
  })

  it('isContactChannel accepts canonical values and rejects legacy ones', () => {
    expect(isContactChannel('import')).toBe(true)
    expect(isContactChannel('telegram')).toBe(true)
    expect(isContactChannel('CSV Import')).toBe(false)
    expect(isContactChannel('Manual Entry')).toBe(false)
    expect(isContactChannel('identifier')).toBe(false)
    expect(isContactChannel(null)).toBe(false)
  })

  it('normalizeLegacyContactSource folds legacy values into channel + detail', () => {
    expect(normalizeLegacyContactSource('CSV Import')).toEqual({
      channel: 'import',
      detail: 'csv',
    })
    expect(normalizeLegacyContactSource('ActiveCampaign')).toEqual({
      channel: 'import',
      detail: 'activecampaign',
    })
    expect(normalizeLegacyContactSource('GoHighLevel')).toEqual({
      channel: 'import',
      detail: 'gohighlevel',
    })
    expect(normalizeLegacyContactSource('Manual Entry')).toEqual({
      channel: 'manual',
      detail: null,
    })
    expect(normalizeLegacyContactSource('identifier')).toEqual({
      channel: 'integration',
      detail: 'identifier',
    })
    expect(normalizeLegacyContactSource('telegram')).toEqual({
      channel: 'telegram',
      detail: null,
    })
    expect(normalizeLegacyContactSource('Something Custom')).toEqual({
      channel: null,
      detail: 'Something Custom',
    })
    expect(normalizeLegacyContactSource(null)).toEqual({ channel: null, detail: null })
  })
})
