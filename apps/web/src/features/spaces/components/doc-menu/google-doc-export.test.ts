import { describe, expect, it } from 'vitest'
import { googleDocHref, googleDocMetadataPatch } from '@/lib/spaces/space-doc-export'

describe('Google Doc export metadata', () => {
  it('reuses a saved native Google Doc by its file id', () => {
    expect(googleDocHref({ _google_doc_file_id: 'doc_123-abc' })).toBe(
      'https://docs.google.com/document/d/doc_123-abc/edit',
    )
  })

  it('ignores invalid saved file ids', () => {
    expect(googleDocHref({ _google_doc_file_id: '../not-safe' })).toBeNull()
  })

  it('builds the shallow custom-data patch used after first export', () => {
    expect(
      googleDocMetadataPatch(
        {
          id: 'doc-1',
          webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
        },
        '2026-07-16T12:00:00.000Z',
      ),
    ).toEqual({
      _google_doc_file_id: 'doc-1',
      _google_doc_web_view_link: 'https://docs.google.com/document/d/doc-1/edit',
      _google_doc_exported_at: '2026-07-16T12:00:00.000Z',
    })
  })
})
