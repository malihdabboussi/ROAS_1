import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TaskActivityFilePreview,
  TaskActivityUrlPreview,
  shouldRenderFieldFilePreview,
  shouldRenderFieldUrlPreview,
} from './TaskActivityFilePreview'

const previewMocks = vi.hoisted(() => ({
  ChatAttachmentPreviews: vi.fn(
    ({
      documents,
    }: {
      documents: DocumentAttachment[]
      className?: string
      compact?: boolean
    }) => (
      <div data-testid="chat-attachment-previews">
        {documents.map((doc) => (
          <span key={doc.filename}>
            {doc.filename}:{doc.mimeType ?? 'no-mime'}:{doc.text ?? 'no-text'}
          </span>
        ))}
      </div>
    ),
  ),
}))

vi.mock('@/components/chat/ChatAttachmentPreviewsAdapter', () => ({
  ChatAttachmentPreviews: previewMocks.ChatAttachmentPreviews,
}))

describe('TaskActivityFilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => 'Fetched text preview',
      })),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders added file previews, fetches text attachments, and settles across rerenders', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <TaskActivityFilePreview
        from={[]}
        to={[
          {
            url: 'https://assets.example.com/brief.txt',
            name: 'brief.txt',
            mime_type: 'text/plain',
          },
        ]}
        fieldId="attachments"
      />,
    )

    expect(screen.getByTestId('chat-attachment-previews')).toHaveTextContent(
      'brief.txt:text/plain:no-text',
    )
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('https://assets.example.com/brief.txt'))
    expect(await screen.findByText('brief.txt:text/plain:Fetched text preview')).toBeInTheDocument()

    rerender(
      <TaskActivityFilePreview
        from={[]}
        to={[
          {
            url: 'https://assets.example.com/image.png',
            name: 'image.png',
            mime_type: 'image/png',
          },
        ]}
        fieldId="attachments"
      />,
    )
    expect(screen.getByText('image.png:image/png:no-text')).toBeInTheDocument()
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })

  it('keeps URL fields separate from file attachment previews', () => {
    const payload = {
      field: 'website_url',
      from: null,
      to: 'example.com',
    }

    expect(shouldRenderFieldUrlPreview(payload)).toBe(true)
    expect(shouldRenderFieldFilePreview(payload)).toBe(false)

    render(<TaskActivityUrlPreview from={payload.from} to={payload.to} fieldId="website_url" />)
    const link = screen.getByRole('link', { name: 'example.com' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })
})
