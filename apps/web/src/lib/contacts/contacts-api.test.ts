import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  addContactNoteApi,
  fetchContact,
  fetchContacts,
  fetchDistinctContactSourceValues,
  reclassifyContactApi,
  updateContact,
} from './contacts-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)

describe('contacts api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    invalidateCachedFetch('contact-detail:')
  })

  it('fetches contacts with the existing query parameter order', async () => {
    backendGetMock.mockResolvedValue({ data: [], total: 0 })

    await expect(
      fetchContacts({ search: 'ada', sort: 'updated_at.desc', limit: 20, offset: 40 }),
    ).resolves.toEqual({ data: [], total: 0 })

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/leads/contacts?search=ada&sort=updated_at.desc&limit=20&offset=40',
    )
  })

  it('returns sorted distinct non-empty contact source values from the bounded sample', async () => {
    backendGetMock.mockResolvedValue({
      data: [
        { id: '1', contact_source: ' Email ' },
        { id: '2', contact_source: null },
        { id: '3', contact_source: 'alpha' },
        { id: '4', contact_source: 'Email' },
        { id: '5', contact_source: ' ' },
      ],
      total: 5,
    })

    await expect(fetchDistinctContactSourceValues()).resolves.toEqual(['alpha', 'Email'])

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/leads/contacts?sort=updated_at.desc&limit=500',
    )
  })

  it('fetches a contact detail through the existing cache key and route', async () => {
    const contact = { id: 'contact-1', email: 'ada@example.com' }
    backendGetMock.mockResolvedValue(contact)

    await expect(fetchContact('contact-1')).resolves.toEqual(contact)

    expect(backendGetMock).toHaveBeenCalledWith('/api/leads/contacts/contact-1')
  })

  it('updates a contact with the existing route and payload', async () => {
    const updates = { first_name: 'Ada', tags: ['vip'] }
    const contact = { id: 'contact-1', email: 'ada@example.com', ...updates }
    backendPatchMock.mockResolvedValue(contact)

    await expect(updateContact('contact-1', updates)).resolves.toEqual(contact)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/leads/contacts/contact-1', updates)
  })

  it('adds a contact note with the existing tinted payload', async () => {
    backendPostMock.mockResolvedValue({ ok: true })

    await expect(addContactNoteApi('contact-1', 'Follow up', 'blue')).resolves.toEqual({
      ok: true,
    })

    expect(backendPostMock).toHaveBeenCalledWith('/api/leads/contacts/contact-1/notes', {
      content: 'Follow up',
      card_tint: 'blue',
    })
  })

  it('normalizes a missing contact note tint to null', async () => {
    backendPostMock.mockResolvedValue({ ok: true })

    await addContactNoteApi('contact-1', 'Follow up')

    expect(backendPostMock).toHaveBeenCalledWith('/api/leads/contacts/contact-1/notes', {
      content: 'Follow up',
      card_tint: null,
    })
  })

  it('reclassifies a contact with the existing route and payload', async () => {
    const payload = { new_contact_type: 'customer', confirmed: true }
    const response = { requires_confirmation: false, summary: {} }
    backendPostMock.mockResolvedValue(response)

    await expect(reclassifyContactApi('contact-1', payload)).resolves.toEqual(response)

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/leads/contacts/contact-1/reclassify',
      payload,
    )
  })
})
