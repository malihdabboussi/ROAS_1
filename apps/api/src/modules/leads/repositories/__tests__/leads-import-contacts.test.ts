import { describe, expect, it } from 'vitest'
import { TableSupabaseHarness } from '../../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../leads.repository'

describe('LeadsRepository contact imports write identifiers', () => {
  const repo = new LeadsRepository()

  it('importContactsBatch dedupes against owner-scoped identifiers and writes identifier rows', async () => {
    const db = new TableSupabaseHarness()
    // Contact created by ANOTHER member of the same org — must still count as a duplicate.
    db.table('contacts').push({
      id: 'contact-x',
      user_id: 'user-2',
      org_id: 'org-1',
      email: 'b@x.com',
      tags: [],
    })
    db.table('contact_identifiers').push({
      id: 'ident-x',
      contact_id: 'contact-x',
      owner_key: 'org-1',
      kind: 'email',
      value: 'b@x.com',
    })

    const result = await repo.importContactsBatch(
      db.client,
      'user-1',
      [
        {
          email: 'a@x.com',
          first_name: 'Ann',
          last_name: null,
          phone: null,
          contact_source: 'import',
          contact_source_detail: 'csv',
        },
        {
          email: 'b@x.com',
          first_name: 'Bob',
          last_name: null,
          phone: null,
          contact_source: 'import',
          contact_source_detail: 'csv',
        },
      ],
      'org-1',
    )

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)

    const created = db.table('contacts').find((row) => row.email === 'a@x.com')
    expect(created).toMatchObject({
      org_id: 'org-1',
      contact_source: 'import',
      contact_source_detail: 'csv',
    })
    expect(db.table('contact_identifiers')).toContainEqual(
      expect.objectContaining({
        contact_id: created?.id,
        owner_key: 'org-1',
        kind: 'email',
        value: 'a@x.com',
      }),
    )
    // No second identifier for the duplicate email.
    expect(db.table('contact_identifiers').filter((row) => row.value === 'b@x.com')).toHaveLength(1)
  })

  it('createUserContact writes the manual channel and an email identifier', async () => {
    const db = new TableSupabaseHarness()

    const contact = (await repo.createUserContact(
      db.client,
      'user-1',
      {
        email: 'new@x.com',
        first_name: 'New',
        last_name: null,
        phone: null,
        source: 'manual',
        contact_source: 'manual',
      },
      'org-1',
    )) as { id: string }

    expect(db.table('contacts')[0]).toMatchObject({
      email: 'new@x.com',
      contact_source: 'manual',
    })
    expect(db.table('contact_identifiers')).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        owner_key: 'org-1',
        kind: 'email',
        value: 'new@x.com',
      }),
    )
  })
})
