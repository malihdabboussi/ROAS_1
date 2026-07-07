import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelHtmlPreview } from './FunnelHtmlPreview'

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}))

const bundle = {
  page: {
    id: 'page-1',
    funnel_id: 'funnel-1',
    name: 'Page',
    updated_at: '2026-06-16T00:00:00.000Z',
  },
  files: [
    {
      id: 'file-1',
      path: 'index.html',
      content: '<!doctype html><html><body><h1>Page</h1></body></html>',
      mime_type: 'text/html',
      role: 'entry',
    },
  ],
  shared_files: [],
  assets: [],
} as never

describe('FunnelHtmlPreview', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('delegates iframe history messages', async () => {
    const onHistoryRequest = vi.fn()

    render(<FunnelHtmlPreview bundle={bundle} onHistoryRequest={onHistoryRequest} />)

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'funnel:history', direction: 'undo' },
      }),
    )

    await waitFor(() => expect(onHistoryRequest).toHaveBeenCalledWith('undo'))
  })
})
