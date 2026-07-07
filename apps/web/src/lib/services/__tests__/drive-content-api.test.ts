import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { clearDriveFileContentCache, fetchDriveFileContent } from '@/lib/services/drive-content-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('drive-content-api cache', () => {
  beforeEach(() => {
    clearDriveFileContentCache()
    backendGetMock.mockReset()
    vi.useRealTimers()
  })

  it('reuses cached value for the same file and modified time', async () => {
    backendGetMock.mockResolvedValue({
      kind: 'html',
      mime_type: 'text/html',
      modified_time: '2026-04-29T10:00:00.000Z',
      content: '<p>A</p>',
    })

    const first = await fetchDriveFileContent('drive-file-1', '2026-04-29T10:00:00.000Z')
    const second = await fetchDriveFileContent('drive-file-1', '2026-04-29T10:00:00.000Z')

    expect(first.content).toBe('<p>A</p>')
    expect(second.content).toBe('<p>A</p>')
    expect(backendGetMock).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache when modified time changes', async () => {
    backendGetMock
      .mockResolvedValueOnce({
        kind: 'html',
        mime_type: 'text/html',
        modified_time: '2026-04-29T10:00:00.000Z',
        content: '<p>Old</p>',
      })
      .mockResolvedValueOnce({
        kind: 'html',
        mime_type: 'text/html',
        modified_time: '2026-04-29T10:05:00.000Z',
        content: '<p>New</p>',
      })

    const oldContent = await fetchDriveFileContent('drive-file-2', '2026-04-29T10:00:00.000Z')
    const newContent = await fetchDriveFileContent('drive-file-2', '2026-04-29T10:05:00.000Z')

    expect(oldContent.content).toBe('<p>Old</p>')
    expect(newContent.content).toBe('<p>New</p>')
    expect(backendGetMock).toHaveBeenCalledTimes(2)
  })

  it('expires cache entries after 5 minutes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'))

    backendGetMock
      .mockResolvedValueOnce({
        kind: 'html',
        mime_type: 'text/html',
        modified_time: '2026-04-29T10:00:00.000Z',
        content: '<p>Before TTL</p>',
      })
      .mockResolvedValueOnce({
        kind: 'html',
        mime_type: 'text/html',
        modified_time: '2026-04-29T10:00:00.000Z',
        content: '<p>After TTL</p>',
      })

    const first = await fetchDriveFileContent('drive-file-3', '2026-04-29T10:00:00.000Z')
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    const second = await fetchDriveFileContent('drive-file-3', '2026-04-29T10:00:00.000Z')

    expect(first.content).toBe('<p>Before TTL</p>')
    expect(second.content).toBe('<p>After TTL</p>')
    expect(backendGetMock).toHaveBeenCalledTimes(2)
  })
})
