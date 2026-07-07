import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { TableSupabaseHarness } from '../../../test/utils/table-supabase-harness'
import { LeadsRepository } from '../repositories/leads.repository'
import { LeadEmailService } from './lead-email.service'

function seedContact(db: TableSupabaseHarness, email = 'Jane@X.com'): void {
  db.table('contacts').push({
    id: 'contact-1',
    user_id: 'user-1',
    org_id: 'org-1',
    email,
    first_name: 'Jane',
    last_name: 'Doe',
    contact_type: 'lead',
  })
}

function seedSenderIdentity(db: TableSupabaseHarness): void {
  db.table('email_sender_identities').push({
    id: 'sender-1',
    user_id: 'user-1',
    org_id: 'org-1',
    domain_id: 'domain-1',
    from_email: 'sender@x.com',
    from_name: 'Sender Name',
    reply_to_email: 'reply@x.com',
    reply_to_name: 'Replies',
    address: '1 Main',
    address_2: null,
    city: 'Town',
    state: 'CA',
    zip: '90000',
    country: 'US',
    signature: '<p>Sig</p>',
    is_verified: true,
    is_default: true,
    created_at: '2026-06-08T10:00:00.000Z',
  })
}

function seedLead(db: TableSupabaseHarness): void {
  db.table('leads').push({
    id: 'lead-1',
    user_id: 'user-1',
    org_id: 'org-1',
    email: 'jane@x.com',
    created_at: '2026-06-08T10:00:00.000Z',
  })
}

function createService(sendEmail = vi.fn().mockResolvedValue({ messageId: 'sg-1' })) {
  const footer = {
    newSendCorrelationId: vi.fn(() => 'send-1'),
    shouldHideBranding: vi.fn().mockResolvedValue(false),
    buildUnsubscribeUrl: vi.fn().mockReturnValue('https://app.test/unsubscribe/token'),
    appendSignatureAndFooter: vi.fn().mockReturnValue({
      html: '<p>Hello</p><footer>Footer</footer>',
      text: 'Hello\nFooter',
    }),
  }
  const sendGrid = { sendEmail }
  const service = new LeadEmailService(
    new LeadsRepository(),
    sendGrid as never,
    footer as never,
  )
  return { footer, sendEmail, service }
}

describe('LeadEmailService', () => {
  it('sends the email and records a sent email_sends row', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db)
    seedSenderIdentity(db)
    seedLead(db)
    const { sendEmail, service } = createService()

    const result = await service.sendEmailToContact(
      db.client,
      'contact-1',
      { subject: ' Hello ', body: '<p>Hello</p>' },
      'org-1',
    )

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: 'jane@x.com', name: 'Jane Doe' },
        from: { email: 'sender@x.com', name: 'Sender Name' },
        replyTo: { email: 'reply@x.com', name: 'Replies' },
        subject: 'Hello',
        headers: expect.objectContaining({
          'List-Unsubscribe': '<https://app.test/unsubscribe/token>',
        }),
      }),
    )
    expect(result.email).toMatchObject({
      id: 'send-1',
      lead_id: 'lead-1',
      status: 'sent',
      sendgrid_message_id: 'sg-1',
    })
    expect(db.table('email_sends')).toContainEqual(
      expect.objectContaining({
        id: 'send-1',
        user_id: 'user-1',
        org_id: 'org-1',
        domain_id: 'domain-1',
        lead_id: 'lead-1',
        status: 'sent',
      }),
    )
  })

  it('persists a failed email_sends row when SendGrid rejects', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db)
    seedSenderIdentity(db)
    seedLead(db)
    const sendError = new Error('SendGrid error: denied')
    const { service } = createService(vi.fn().mockRejectedValue(sendError))

    await expect(
      service.sendEmailToContact(
        db.client,
        'contact-1',
        { subject: 'Hello', body: '<p>Hello</p>' },
        'org-1',
      ),
    ).rejects.toThrow(sendError)

    expect(db.table('email_sends')).toContainEqual(
      expect.objectContaining({
        id: 'send-1',
        status: 'failed',
        error_message: 'SendGrid error: denied',
      }),
    )
  })

  it('requires a contact email before resolving sender data', async () => {
    const db = new TableSupabaseHarness()
    seedContact(db, null as unknown as string)
    const { sendEmail, service } = createService()

    await expect(
      service.sendEmailToContact(
        db.client,
        'contact-1',
        { subject: 'Hello', body: '<p>Hello</p>' },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
