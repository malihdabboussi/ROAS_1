import { createHash } from 'crypto'
import { describe, expect, it, vi } from 'vitest'
import { ContentDedupeRepository } from '../../repositories/content-dedupe.repository'
import { ContentDedupeService } from '../content-dedupe.service'

function sha(value: string): string {
  return createHash('sha256').update(value.replace(/\s+/g, ' ').trim().toLowerCase()).digest('hex')
}

describe('ContentDedupeService', () => {
  it('returns duplicate when the content hash already exists for the brain', async () => {
    const query: Record<string, unknown> = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: 'hash-1' }, error: null })),
      insert: vi.fn(() => query),
    }
    const client = { from: vi.fn(() => query) }
    const service = new ContentDedupeService(new ContentDedupeRepository({ client: {} } as any))

    await expect(
      service.registerForBrain(client as any, 'brain-1', '  Hello   World ', 'document'),
    ).resolves.toEqual({ duplicate: true, contentHash: sha('Hello World') })

    expect(query.insert).not.toHaveBeenCalled()
  })

  it('treats a unique insert conflict as a duplicate registration', async () => {
    const query: Record<string, unknown> = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      insert: vi.fn(async () => ({ error: { code: '23505', message: 'duplicate key' } })),
    }
    const client = { from: vi.fn(() => query) }
    const service = new ContentDedupeService(new ContentDedupeRepository({ client: {} } as any))

    await expect(
      service.registerForBrain(client as any, 'brain-1', 'Duplicate text', 'document'),
    ).resolves.toEqual({ duplicate: true, contentHash: sha('Duplicate text') })
  })
})
