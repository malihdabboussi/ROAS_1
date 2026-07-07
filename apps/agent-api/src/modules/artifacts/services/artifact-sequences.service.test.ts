import { describe, expect, it, vi } from 'vitest'
import { ArtifactSequencesService } from './artifact-sequences.service'

function makeSequenceDb() {
  const sequences = [
    {
      id: 'sequence-1',
      user_id: 'user-1',
      org_id: 'org-1',
      campaign_id: 'campaign-1',
      name: 'Launch Sequence',
      space_id: null,
    },
  ]
  const emails = [
    {
      id: 'email-1',
      sequence_id: 'sequence-1',
      subject: 'Welcome',
      body: '<p>Hello</p>',
      order_index: 1,
      delay_hours: 0,
    },
  ]
  const insertedEmails: Array<Record<string, unknown>> = []
  const updatedEmails: Array<Record<string, unknown>> = []

  const supabase = {
    from: vi.fn((table: string) => {
      const filters = new Map<string, unknown>()
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: unknown) => {
          filters.set(column, value)
          return chain
        }),
        is: vi.fn((column: string, value: unknown) => {
          filters.set(column, value)
          return chain
        }),
        order: vi.fn(async () => {
          if (table === 'sequences') return { data: sequences, error: null }
          if (table === 'sequence_emails') return { data: emails, error: null }
          return { data: [], error: null }
        }),
        maybeSingle: vi.fn(async () => {
          if (table === 'sequences') {
            const id = filters.get('id')
            return {
              data: sequences.find((row) => row.id === id) ?? null,
              error: null,
            }
          }
          if (table === 'sequence_emails') {
            const id = filters.get('id')
            return {
              data: emails.find((row) => row.id === id) ?? null,
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        insert: vi.fn((payload: Record<string, unknown>) => {
          if (table === 'sequence_emails') insertedEmails.push(payload)
          return chain
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          if (table === 'sequence_emails') updatedEmails.push(payload)
          return chain
        }),
        single: vi.fn(async () => ({
          data: {
            id: 'email-new',
            sequence_id: insertedEmails[0]?.sequence_id,
            subject: insertedEmails[0]?.subject,
            body: insertedEmails[0]?.body,
            order_index: insertedEmails[0]?.order_index,
            delay_hours: insertedEmails[0]?.delay_hours,
          },
          error: null,
        })),
      }
      return chain
    }),
  }

  return { emails, insertedEmails, sequences, supabase, updatedEmails }
}

function makeTarget(supabase: Record<string, unknown>, orgId: string | null = 'org-1') {
  return {
    getUserClient: vi.fn(async () => supabase),
    logger: { warn: vi.fn() },
    mainApiCall: vi.fn(async () => ({
      success: true,
      providers: [{ provider: 'resend', display_name: 'Resend', supports_sequences: true }],
    })),
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    resolveOrgId: vi.fn(() => orgId),
    resolveUserId: vi.fn(() => 'user-1'),
  }
}

describe('ArtifactSequencesService', () => {
  it('lists campaign sequences with org scope and embedded emails', async () => {
    const db = makeSequenceDb()
    const target = makeTarget(db.supabase)
    const handlers = new ArtifactSequencesService().getHandlers(target)

    await expect(handlers.list_sequences({}, 'session-1')).resolves.toEqual(db.sequences)

    expect(db.supabase.from).toHaveBeenCalledWith('sequences')
    expect(target.resolveCampaignId).toHaveBeenCalledWith(
      db.supabase,
      {},
      'user-1',
      'session-1',
    )
  })

  it('adds a sequence email and returns a preview block', async () => {
    const db = makeSequenceDb()
    const target = makeTarget(db.supabase)
    const handlers = new ArtifactSequencesService().getHandlers(target)

    const result = (await handlers.add_sequence_email(
      {
        sequence_id: 'sequence-1',
        subject: 'Follow up',
        body: '<p>Body</p>',
        order_index: 2,
        delay_hours: 24,
      },
      'session-1',
    )) as Record<string, unknown>

    expect(db.insertedEmails[0]).toMatchObject({
      sequence_id: 'sequence-1',
      subject: 'Follow up',
      body: '<p>Body</p>',
      order_index: 2,
      delay_hours: 24,
    })
    expect(result.ui_blocks).toEqual([
      expect.objectContaining({
        artifactId: 'sequence-1',
        bodyPreview: 'Body',
        emailSubject: 'Follow up',
        type: 'artifact_preview',
      }),
    ])
  })

  it('prepares a sequence send with ordered email previews and providers', async () => {
    const db = makeSequenceDb()
    const target = makeTarget(db.supabase)
    const handlers = new ArtifactSequencesService().getHandlers(target)

    const result = (await handlers.prepare_sequence_send(
      { sequence_id: 'sequence-1' },
      'session-1',
    )) as Record<string, any>

    expect(result).toMatchObject({ success: true, status: 'pending_approval' })
    expect(result.ui_blocks[0]).toMatchObject({
      send_type: 'sequence',
      sequence_id: 'sequence-1',
      sequence_name: 'Launch Sequence',
      available_providers: [{ id: 'resend', name: 'Resend', supports_sequences: true }],
      emails: [
        {
          id: 'email-1',
          subject: 'Welcome',
          order_index: 1,
          delay_hours: 0,
          html_preview: 'Hello',
        },
      ],
    })
  })

  it('updates a sequence email after validating sequence ownership', async () => {
    const db = makeSequenceDb()
    const target = makeTarget(db.supabase)
    const handlers = new ArtifactSequencesService().getHandlers(target)

    const result = await handlers.update_sequence_email(
      {
        sequence_email_id: 'email-1',
        subject: 'Updated',
        delay_hours: 12,
      },
      'session-1',
    )

    expect(db.updatedEmails[0]).toEqual({ subject: 'Updated', delay_hours: 12 })
    expect(result).toMatchObject({ subject: 'Welcome', sequence_id: 'sequence-1' })
  })
})
