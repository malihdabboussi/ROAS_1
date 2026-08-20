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

  it.each([
    {
      id: '946a12f3-21e0-431f-87d9-eec0860e3a23',
      title: 'Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts',
    },
    {
      id: '5d90acb9-a2fc-4202-b7b1-ee1aeb1ea630',
      title: 'Christian Osgood — Free + Shipping Book Funnel: Modular UGC Ad Scripts',
    },
  ])('unwraps JSON-string conversation_documents.content for $id', ({ title }) => {
    const markdown = `# ${title}\n\n## Hook\nFirst line of the ad script.`
    expect(extractMarkdownFromDocumentContent(JSON.stringify(markdown))).toBe(markdown)
    expect(extractMarkdownFromDocumentContent(markdown)).toBe(markdown)
  })
})
