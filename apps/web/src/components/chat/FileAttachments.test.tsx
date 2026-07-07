import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileAttachments, type AttachedFile } from './FileAttachments'

function makeFile(name: string, type: string): File {
  return new File(['content'], name, { type })
}

describe('FileAttachments', () => {
  it('shows document reading, ready, and failed states', () => {
    const files: AttachedFile[] = [
      {
        id: 'reading',
        file: makeFile('reading.pdf', 'application/pdf'),
        uploading: false,
        documentStatus: 'processing',
        parsed: [
          {
            filename: 'reading.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200,
            type: 'text',
            mediaAssetId: 'asset-reading',
          },
        ],
      },
      {
        id: 'ready',
        file: makeFile('ready.pdf', 'application/pdf'),
        uploading: false,
        documentStatus: 'ready',
        parsed: [
          {
            filename: 'ready.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200,
            type: 'text',
            mediaAssetId: 'asset-ready',
          },
        ],
      },
      {
        id: 'failed',
        file: makeFile('failed.pdf', 'application/pdf'),
        uploading: false,
        documentStatus: 'failed',
        parsed: [
          {
            filename: 'failed.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200,
            type: 'text',
            mediaAssetId: 'asset-failed',
          },
        ],
      },
    ]

    render(<FileAttachments files={files} onRemove={vi.fn()} />)

    expect(screen.getByText('Reading')).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    expect(screen.getByText('Failed')).toBeTruthy()
  })
})
