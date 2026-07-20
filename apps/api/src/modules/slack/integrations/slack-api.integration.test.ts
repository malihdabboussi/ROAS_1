import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSlackAuthError, SlackApiIntegration } from './slack-api.integration'

describe('SlackApiIntegration', () => {
  let integration: SlackApiIntegration
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    integration = new SlackApiIntegration()
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uploadExternalFileToChannel runs getUploadURL → binary POST → completeUploadExternal', async () => {
    const buf = Buffer.from('hello')
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          upload_url: 'https://files.slack.com/upload/v1/abc',
          file_id: 'F111',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, files: [{ id: 'F111', title: 'doc.pdf' }] }),
      })

    await integration.uploadExternalFileToChannel('xoxb-test', 'C1', buf, 'doc.pdf', '1234.5678')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('files.getUploadURLExternal')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ filename: 'doc.pdf', length: 5 }),
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://files.slack.com/upload/v1/abc')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    const completeInit = fetchMock.mock.calls[2]?.[1] as RequestInit
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('files.completeUploadExternal')
    expect(JSON.parse(completeInit.body as string)).toEqual({
      files: [{ id: 'F111', title: 'doc.pdf' }],
      channel_id: 'C1',
      thread_ts: '1234.5678',
    })
  })

  it('uploadExternalFileToChannel throws when files.getUploadURLExternal returns ok false', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'missing_scope' }),
    })
    await expect(
      integration.uploadExternalFileToChannel('t', 'C', Buffer.from('x'), 'f.txt'),
    ).rejects.toThrow('missing_scope')
  })

  it('maps invalid_auth to SlackAuthError', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'invalid_auth' }),
    })

    try {
      await integration.listConversations('bad-token')
      throw new Error('expected listConversations to fail')
    } catch (error) {
      expect(isSlackAuthError(error)).toBe(true)
    }
  })

  it('loads every page of members for a visible Slack channel', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          members: ['U1', 'U2'],
          response_metadata: { next_cursor: 'next-page' },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, members: ['U3'], response_metadata: {} }),
      })

    await expect(integration.listConversationMembers('xoxb', 'C1')).resolves.toEqual([
      'U1',
      'U2',
      'U3',
    ])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('cursor=next-page')
  })

  it('uploadExternalFileToChannel throws when binary upload is not ok', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          upload_url: 'https://files.slack.com/upload/v1/abc',
          file_id: 'F111',
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(
      integration.uploadExternalFileToChannel('t', 'C', Buffer.from('x'), 'f.txt'),
    ).rejects.toThrow('Slack upload URL returned 500')
  })
})
