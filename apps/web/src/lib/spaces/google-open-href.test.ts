import { describe, expect, it } from 'vitest'
import {
  driveOpenHref,
  googleFileId,
  googleNativeOpenHref,
  safeGoogleOpenHref,
} from './google-open-href'

describe('google open hrefs', () => {
  it('accepts only https Google Docs/Drive URLs', () => {
    expect(safeGoogleOpenHref('https://docs.google.com/document/d/abc/edit')).toBe(
      'https://docs.google.com/document/d/abc/edit',
    )
    expect(safeGoogleOpenHref('https://evil.example/docs.google.com')).toBeNull()
    expect(safeGoogleOpenHref('javascript:alert(1)')).toBeNull()
  })

  it('extracts a file id from a Google URL-shaped value', () => {
    expect(googleFileId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    )
    expect(
      googleFileId(
        'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      ),
    ).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
    expect(googleFileId('../not-safe')).toBeNull()
  })

  it('opens native Google Docs at docs.google.com, not Drive file/view', () => {
    expect(googleNativeOpenHref('doc-1', 'application/vnd.google-apps.document')).toBe(
      'https://docs.google.com/document/d/doc-1/edit',
    )
    expect(driveOpenHref('doc-1', null, 'application/vnd.google-apps.document')).toBe(
      'https://docs.google.com/document/d/doc-1/edit',
    )
    expect(driveOpenHref('doc-1', null, 'application/pdf')).toBe(
      'https://drive.google.com/file/d/doc-1/view',
    )
  })

  it('prefers a saved webViewLink when it is a real Google URL', () => {
    expect(
      driveOpenHref(
        'doc-1',
        'https://docs.google.com/document/d/doc-1/edit',
        'application/vnd.google-apps.document',
      ),
    ).toBe('https://docs.google.com/document/d/doc-1/edit')
  })

  it('ignores Drive file/view links for native Docs/Sheets/Slides', () => {
    expect(
      driveOpenHref(
        'doc-1',
        'https://drive.google.com/file/d/doc-1/view',
        'application/vnd.google-apps.document',
      ),
    ).toBe('https://docs.google.com/document/d/doc-1/edit')
  })
})
