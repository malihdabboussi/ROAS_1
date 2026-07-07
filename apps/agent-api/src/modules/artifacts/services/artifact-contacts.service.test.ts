import { describe, expect, it, vi } from 'vitest'
import { ArtifactContactsService } from './artifact-contacts.service'

function makeTarget(orgId: string | null = 'org-1') {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => orgId),
    resolveOrgRole: vi.fn(() => 'member'),
    getUserClient: vi.fn(async () => ({ from: vi.fn() })),
  }
}

function makeRepository(overrides: Record<string, unknown> = {}) {
  return {
    listContacts: vi.fn(async () => ({
      data: [{ id: 'contact-1', email: 'sarah@example.com' }],
      count: 1,
      hasMore: false,
      error: null,
    })),
    findContactById: vi.fn(async () => ({
      data: { id: 'contact-1', email: 'sarah@example.com' },
      error: null,
    })),
    findContactEmailForOwner: vi.fn(async () => ({ data: null, error: null })),
    createContact: vi.fn(async () => ({
      data: { id: 'contact-1', email: 'sarah@example.com' },
      error: null,
    })),
    updateContact: vi.fn(async () => ({
      data: { id: 'contact-1', tags: ['vip'] },
      error: null,
    })),
    ...overrides,
  }
}

function makeTimelineRepository(overrides: Record<string, unknown> = {}) {
  return {
    findContactActivity: vi.fn(async () => ({
      contact: { id: 'contact-1', email: 'sarah@example.com' },
      events: [{ id: 'activity-1', event_type: 'note_added' }],
      total: 3,
    })),
    listContactCommunications: vi.fn(async () => ({
      contact: { id: 'contact-1', email: 'sarah@example.com' },
      emails: [{ id: 'email-1', subject: 'Welcome' }],
      conversations: [{ id: 'conversation-1', channel: 'telegram' }],
      suggested_conversations: [{ id: 'conversation-2', channel: 'telegram' }],
      total: { emails: 1, conversations: 1, suggested_conversations: 1 },
    })),
    ...overrides,
  }
}

function makeNotesRepository(overrides: Record<string, unknown> = {}) {
  return {
    addContactNote: vi.fn(async () => ({
      data: {
        id: 'note-1',
        contact_id: 'contact-1',
        content: 'Follow up Friday',
        card_tint: 'teal',
      },
      error: null,
    })),
    updateContactNote: vi.fn(async () => ({
      data: {
        id: 'note-1',
        contact_id: 'contact-1',
        content: 'Updated note',
        card_tint: 'amber',
      },
      error: null,
    })),
    ...overrides,
  }
}

describe('ArtifactContactsService', () => {
  it('requires organization scope for contacts actions', async () => {
    const repository = makeRepository()
    const service = new ArtifactContactsService(repository as never)
    const result = (await service.getHandlers(makeTarget(null)).list_contacts(
      {},
      'agent:vibey:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('organization scope')
    expect(repository.listContacts).not.toHaveBeenCalled()
  })

  it('normalizes CRM list inputs and passes org scope to the repository', async () => {
    const repository = makeRepository()
    const service = new ArtifactContactsService(repository as never)
    const result = (await service.getHandlers(makeTarget()).list_contacts(
      {
        query: ' Sarah ',
        contactType: 'customer',
        campaignId: 'campaign-1',
        includeArchived: true,
        limit: 250,
        offset: 5,
      },
      'agent:vibey:stub',
    )) as { success: boolean; contacts: Array<Record<string, unknown>>; total: number }

    expect(result.success).toBe(true)
    expect(result.contacts).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(repository.listContacts).toHaveBeenCalledWith(expect.anything(), {
      orgId: 'org-1',
      search: 'Sarah',
      sort: null,
      limit: 100,
      offset: 5,
      filters: null,
      includeArchived: true,
      contactType: 'customer',
      campaignId: 'campaign-1',
    })
  })

  it('creates only the current backend-supported contact fields', async () => {
    const repository = makeRepository()
    const service = new ArtifactContactsService(repository as never)
    const result = (await service.getHandlers(makeTarget()).create_contact(
      {
        email: ' SARAH@EXAMPLE.COM ',
        first_name: ' Sarah ',
        last_name: ' Levy ',
        phone: ' +15551234567 ',
        tags: ['ignored-by-schema-before-runtime'],
      },
      'agent:vibey:stub',
    )) as { success: boolean; contact: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(repository.findContactEmailForOwner).toHaveBeenCalledWith(expect.anything(), {
      userId: 'user-1',
      orgId: 'org-1',
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Levy',
      phone: '+15551234567',
    })
    expect(repository.createContact).toHaveBeenCalledWith(expect.anything(), {
      userId: 'user-1',
      orgId: 'org-1',
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Levy',
      phone: '+15551234567',
    })
  })

  it('updates only allowed contact fields and validates contact_source', async () => {
    const repository = makeRepository()
    const service = new ArtifactContactsService(repository as never)
    const result = (await service.getHandlers(makeTarget()).update_contact(
      {
        contact_id: 'contact-1',
        tags: ['vip'],
        custom_fields: { tier: 'gold' },
        business_name: 'Acme Health',
        unknown: 'ignored',
      },
      'agent:vibey:stub',
    )) as { success: boolean }

    expect(result.success).toBe(true)
    expect(repository.updateContact).toHaveBeenCalledWith(expect.anything(), {
      contactId: 'contact-1',
      orgId: 'org-1',
      actorUserId: 'user-1',
      updates: {
        tags: ['vip'],
        custom_fields: { tier: 'gold' },
        business_name: 'Acme Health',
      },
    })

    const invalid = (await service.getHandlers(makeTarget()).update_contact(
      { contact_id: 'contact-1', contact_source: 'CSV Import' },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }
    expect(invalid.success).toBe(false)
    expect(invalid.error).toContain('contact_source must be one of')
  })

  it('adds contact notes through the org-scoped notes repository', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const notesRepository = makeNotesRepository()
    const service = new ArtifactContactsService(
      repository as never,
      timelineRepository as never,
      notesRepository as never,
    )
    const result = (await service.getHandlers(makeTarget()).add_contact_note(
      {
        contact_id: 'contact-1',
        content: ' Follow up Friday ',
        card_tint: 'teal',
      },
      'agent:vibey:stub',
    )) as { success: boolean; note: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.note.id).toBe('note-1')
    expect(notesRepository.addContactNote).toHaveBeenCalledWith(expect.anything(), {
      contactId: 'contact-1',
      orgId: 'org-1',
      userId: 'user-1',
      content: 'Follow up Friday',
      cardTint: 'teal',
    })
  })

  it('updates contact notes with author role context', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const notesRepository = makeNotesRepository()
    const service = new ArtifactContactsService(
      repository as never,
      timelineRepository as never,
      notesRepository as never,
    )
    const result = (await service.getHandlers(makeTarget()).update_contact_note(
      {
        contact_id: 'contact-1',
        note_id: 'note-1',
        content: ' Updated note ',
        card_tint: 'amber',
      },
      'agent:vibey:stub',
    )) as { success: boolean; note: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.note.id).toBe('note-1')
    expect(notesRepository.updateContactNote).toHaveBeenCalledWith(expect.anything(), {
      contactId: 'contact-1',
      noteId: 'note-1',
      orgId: 'org-1',
      userId: 'user-1',
      orgRole: 'member',
      updates: {
        content: 'Updated note',
        card_tint: 'amber',
      },
    })
  })

  it('rejects invalid contact note writes before repository work', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const notesRepository = makeNotesRepository()
    const service = new ArtifactContactsService(
      repository as never,
      timelineRepository as never,
      notesRepository as never,
    )

    const empty = (await service.getHandlers(makeTarget()).add_contact_note(
      { contact_id: 'contact-1', content: ' ' },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }
    expect(empty.success).toBe(false)
    expect(empty.error).toContain('content is required')

    const invalidTint = (await service.getHandlers(makeTarget()).add_contact_note(
      { contact_id: 'contact-1', content: 'Follow up', card_tint: 'espresso' },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }
    expect(invalidTint.success).toBe(false)
    expect(invalidTint.error).toContain('card_tint must be one of')

    const noUpdates = (await service.getHandlers(makeTarget()).update_contact_note(
      { contact_id: 'contact-1', note_id: 'note-1' },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }
    expect(noUpdates.success).toBe(false)
    expect(noUpdates.error).toContain('At least one note field')
    expect(notesRepository.addContactNote).not.toHaveBeenCalled()
    expect(notesRepository.updateContactNote).not.toHaveBeenCalled()
  })

  it('reads contact activity through the org-scoped timeline repository', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const service = new ArtifactContactsService(repository as never, timelineRepository as never)
    const result = (await service.getHandlers(makeTarget()).get_contact_activity(
      { contact_id: 'contact-1', limit: 2, offset: 1 },
      'agent:vibey:stub',
    )) as {
      success: boolean
      events: Array<Record<string, unknown>>
      total: number
      hasMore: boolean
    }

    expect(result.success).toBe(true)
    expect(result.events).toEqual([{ id: 'activity-1', event_type: 'note_added' }])
    expect(result.total).toBe(3)
    expect(result.hasMore).toBe(false)
    expect(timelineRepository.findContactActivity).toHaveBeenCalledWith(expect.anything(), {
      contactId: 'contact-1',
      orgId: 'org-1',
      limit: 2,
      offset: 1,
    })
  })

  it('lists contact communications with channel and body controls', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const service = new ArtifactContactsService(repository as never, timelineRepository as never)
    const result = (await service.getHandlers(makeTarget()).list_contact_communications(
      {
        contact_id: 'contact-1',
        channel: 'telegram',
        include_email_bodies: true,
        limit: 20,
        offset: 5,
      },
      'agent:vibey:stub',
    )) as {
      success: boolean
      conversations: Array<Record<string, unknown>>
      suggested_conversations: Array<Record<string, unknown>>
    }

    expect(result.success).toBe(true)
    expect(result.conversations).toHaveLength(1)
    expect(result.suggested_conversations).toHaveLength(1)
    expect(timelineRepository.listContactCommunications).toHaveBeenCalledWith(expect.anything(), {
      contactId: 'contact-1',
      orgId: 'org-1',
      limit: 20,
      offset: 5,
      includeEmailBodies: true,
      channel: 'telegram',
    })
  })

  it('rejects unsupported communication channels before repository work', async () => {
    const repository = makeRepository()
    const timelineRepository = makeTimelineRepository()
    const service = new ArtifactContactsService(repository as never, timelineRepository as never)
    const result = (await service.getHandlers(makeTarget()).list_contact_communications(
      { contact_id: 'contact-1', channel: 'sms' },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('channel must be one of')
    expect(timelineRepository.listContactCommunications).not.toHaveBeenCalled()
  })
})
