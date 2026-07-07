import { describe, expect, it } from 'vitest'
import {
  extractMarkdownFromDocumentContent,
  normalizeStoredMarkdownText,
} from './document-content-markdown'

describe('normalizeStoredMarkdownText', () => {
  it('normalizes nested JSON text values', () => {
    expect(normalizeStoredMarkdownText(JSON.stringify({ text: '# Heading\\nBody' }))).toBe(
      '# Heading\nBody',
    )
  })

  it('unescapes quoted stored strings', () => {
    expect(normalizeStoredMarkdownText('"Line one\\nLine two"')).toBe('Line one\nLine two')
  })
})

describe('extractMarkdownFromDocumentContent', () => {
  it('extracts markdown from encoded block arrays', () => {
    const content = JSON.stringify({
      blocks: [{ text: 'Intro copy' }, { markdown: 'Details copy' }],
    })

    expect(extractMarkdownFromDocumentContent(content)).toBe('Intro copy\n\nDetails copy')
  })

  it('walks nested document content and ignores empty values', () => {
    expect(
      extractMarkdownFromDocumentContent({
        document: {
          content: {
            body: 'Nested body',
          },
        },
      }),
    ).toBe('Nested body')
  })

  it('falls back to one long string value in unknown shapes', () => {
    expect(
      extractMarkdownFromDocumentContent({
        unknown:
          'This is a long enough markdown payload stored on an unknown key for fallback parsing.',
      }),
    ).toBe('This is a long enough markdown payload stored on an unknown key for fallback parsing.')
  })
})
