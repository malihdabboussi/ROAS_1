import { describe, expect, it, vi } from 'vitest'
import { SessionsStorageRepository } from '../repositories/sessions-storage.repository'
import { SessionsStorageService } from './sessions-storage.service'

function makeService() {
  const bucket = {
    upload: vi.fn(async () => ({ error: null })),
    download: vi.fn(async () => ({
      data: { text: vi.fn(async () => 'stored-content') },
      error: null,
    })),
    list: vi.fn(async () => ({ data: [], error: null })),
  }
  const client = {
    storage: {
      from: vi.fn(() => bucket),
    },
  }

  return {
    service: new SessionsStorageService(new SessionsStorageRepository({ client } as never)),
    bucket,
    client,
  }
}

describe('SessionsStorageService', () => {
  it('uploads sanitized transcript paths to the session transcript bucket', async () => {
    const { service, bucket, client } = makeService()

    await service.uploadTranscript('agent/slash', 'session:one', 'line\n')

    expect(client.storage.from).toHaveBeenCalledWith('session_transcripts')
    expect(bucket.upload).toHaveBeenCalledWith('agent_slash/session_one.jsonl', 'line\n', {
      upsert: true,
      contentType: 'application/octet-stream',
    })
  })

  it('downloads transcript text and maps storage not-found errors to null', async () => {
    const { service, bucket } = makeService()

    await expect(service.downloadTranscript('agent', 'session')).resolves.toBe('stored-content')

    bucket.download.mockResolvedValueOnce({ data: null, error: { message: 'Object not found' } })
    await expect(service.downloadTranscript('agent', 'missing')).resolves.toBeNull()
  })

  it('uploads the session store JSON and preserves the post-upload list probe', async () => {
    const { service, bucket } = makeService()

    await service.uploadStore('agent/slash', '{"ok":true}')

    expect(bucket.upload).toHaveBeenCalledWith('agent_slash/sessions.json', '{"ok":true}', {
      upsert: true,
      contentType: 'application/json',
    })
    expect(bucket.list).toHaveBeenCalledWith('agent_slash', {
      search: 'sessions.json',
      limit: 20,
    })
  })

  it('downloads store text and maps empty storage errors to null', async () => {
    const { service, bucket } = makeService()

    await expect(service.downloadStore('agent')).resolves.toBe('stored-content')

    bucket.download.mockResolvedValueOnce({ data: null, error: { message: '{}' } })
    await expect(service.downloadStore('agent')).resolves.toBeNull()
  })
})
