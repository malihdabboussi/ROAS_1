import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingProviderDefinitionsService } from '../meeting-provider-definitions.service'
import type { NoteTakerDefinition } from '../note-taker-definition.schema'
import { slugFromDisplayName } from '../note-taker-definition.schema'

const validInput = {
  displayName: 'Otter Notes',
  description: 'Otter meeting reports',
  logoUrl: 'https://cdn.example.com/otter.png',
  signature: { scheme: 'hmac_sha256', header: 'X-Otter-Signature', encoding: 'hex' },
  event: { eventTypePath: 'event', acceptValues: ['meeting.completed'] },
  fieldMap: {
    externalId: 'meeting.id',
    title: 'meeting.title',
    transcript: { path: 'meeting.turns[]', text: 'text' },
  },
}

function stored(overrides: Partial<NoteTakerDefinition> = {}): NoteTakerDefinition {
  return {
    id: 'def_1',
    slug: 'nt_otter_notes',
    displayName: 'Otter Notes',
    description: 'Otter meeting reports',
    logoUrl: 'https://cdn.example.com/otter.png',
    signature: {
      scheme: 'hmac_sha256',
      header: 'X-Otter-Signature',
      encoding: 'hex',
      keyEncoding: 'utf8',
    },
    event: { eventTypePath: 'event', acceptValues: ['meeting.completed'] },
    fieldMap: validInput.fieldMap,
    isActive: true,
    createdBy: 'admin_1',
    createdAt: '2026-09-14T00:00:00Z',
    updatedAt: '2026-09-14T00:00:00Z',
    ...overrides,
  }
}

describe('slugFromDisplayName', () => {
  it('prefixes, lowercases and collapses punctuation', () => {
    expect(slugFromDisplayName('Otter Notes')).toBe('nt_otter_notes')
    expect(slugFromDisplayName('  tl;dv -- Pro!!')).toBe('nt_tl_dv_pro')
    expect(() => slugFromDisplayName('!!')).toThrow(/at least two/)
  })
})

describe('MeetingProviderDefinitionsService', () => {
  let repository: Record<string, ReturnType<typeof vi.fn>>
  let service: MeetingProviderDefinitionsService

  beforeEach(() => {
    repository = {
      listActive: vi.fn().mockResolvedValue([stored()]),
      findBySlug: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(stored()),
      update: vi.fn().mockResolvedValue(stored({ displayName: 'Otter Notes v2' })),
      setActive: vi.fn().mockResolvedValue(undefined),
      upsertCatalogRow: vi.fn().mockResolvedValue(undefined),
    }
    service = new MeetingProviderDefinitionsService(repository as never)
  })

  it('lists what the Library needs and nothing secret', async () => {
    await expect(service.list()).resolves.toEqual([
      {
        id: 'def_1',
        slug: 'nt_otter_notes',
        displayName: 'Otter Notes',
        description: 'Otter meeting reports',
        logoUrl: 'https://cdn.example.com/otter.png',
        requiresSecret: true,
        signatureHeader: 'X-Otter-Signature',
        isActive: true,
      },
    ])
  })

  it('creates a definition, derives the slug, and writes the catalog row the FK needs', async () => {
    const result = await service.create(validInput, 'admin_1')
    expect(repository.insert).toHaveBeenCalledWith(
      'nt_otter_notes',
      expect.objectContaining({
        displayName: 'Otter Notes',
        signature: expect.objectContaining({ scheme: 'hmac_sha256', keyEncoding: 'utf8' }),
      }),
      'admin_1',
    )
    expect(repository.upsertCatalogRow).toHaveBeenCalledWith(stored())
    expect(result.slug).toBe('nt_otter_notes')
  })

  it('rejects invalid input with field details and never touches the repository', async () => {
    const bad = {
      ...validInput,
      fieldMap: { externalId: 'a..b', transcript: { path: 'x[]', text: 't' } },
    }
    await expect(service.create(bad, 'admin_1')).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.create({ ...validInput, displayName: '!' }, 'admin_1'),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('refuses a second definition with the same slug', async () => {
    repository.findBySlug.mockResolvedValue(stored())
    await expect(service.create(validInput, 'admin_1')).rejects.toBeInstanceOf(ConflictException)
  })

  it('updates only the given fields and refreshes the catalog row', async () => {
    repository.findBySlug.mockResolvedValue(stored())
    const result = await service.update('nt_otter_notes', { displayName: 'Otter Notes v2' })
    expect(repository.update).toHaveBeenCalledWith('nt_otter_notes', {
      displayName: 'Otter Notes v2',
    })
    expect(repository.upsertCatalogRow).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Otter Notes v2' }),
    )
    expect(result.displayName).toBe('Otter Notes v2')
  })

  it('deactivates instead of deleting, and 404s unknown slugs', async () => {
    await expect(service.deactivate('nt_missing')).rejects.toBeInstanceOf(NotFoundException)
    repository.findBySlug.mockResolvedValue(stored())
    await service.deactivate('nt_otter_notes')
    expect(repository.setActive).toHaveBeenCalledWith('nt_otter_notes', false)
  })

  it('previews the mapping over a sample payload, reporting mapping errors as data', () => {
    const ok = service.preview({
      definition: validInput,
      samplePayload: { meeting: { id: 'm1', title: 'Sync', turns: [{ text: 'hi' }] } },
    })
    expect(ok).toMatchObject({
      ok: true,
      slug: 'nt_otter_notes',
      result: { externalId: 'm1', transcriptTurns: 1 },
    })

    const missing = service.preview({ definition: validInput, samplePayload: { meeting: {} } })
    expect(missing).toMatchObject({ ok: false, error: expect.stringContaining('no meeting id') })

    expect(() => service.preview({ definition: validInput })).toThrow(BadRequestException)
  })
})
