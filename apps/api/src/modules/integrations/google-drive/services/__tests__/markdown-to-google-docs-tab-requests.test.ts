import { describe, expect, it } from 'vitest'
import {
  emptyTableCellIndex,
  emptyTableEndIndex,
  markdownToGoogleDocsTabRequests,
  parseMarkdownBlocks,
} from '../markdown-to-google-docs-tab-requests'

describe('markdownToGoogleDocsTabRequests', () => {
  it('parses headings, bullets, bold marks, and blank paragraphs', () => {
    const blocks = parseMarkdownBlocks('# Title\n\n**Hello** world\n\n- One\n- Two')
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: 'Title', marks: [] },
      { kind: 'empty' },
      {
        kind: 'paragraph',
        text: 'Hello world',
        marks: [{ start: 0, end: 5, bold: true }],
      },
      { kind: 'empty' },
      { kind: 'bullet', text: 'One', marks: [] },
      { kind: 'bullet', text: 'Two', marks: [] },
    ])
  })

  it('builds insert + style requests for a tab and keeps blank spacing', () => {
    const requests = markdownToGoogleDocsTabRequests('# Title\n\nBody with **bold**.', 't.abc')
    expect(requests[0]).toEqual({
      insertText: {
        text: 'Title\n\nBody with bold.\n',
        location: { index: 1, tabId: 't.abc' },
      },
    })
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          updateParagraphStyle: expect.objectContaining({
            range: { startIndex: 1, endIndex: 24, tabId: 't.abc' },
            paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
          }),
        }),
        expect.objectContaining({
          updateParagraphStyle: expect.objectContaining({
            paragraphStyle: { namedStyleType: 'HEADING_1' },
          }),
        }),
        expect.objectContaining({
          updateTextStyle: expect.objectContaining({
            textStyle: { bold: true },
          }),
        }),
      ]),
    )
  })

  it('emits native insertTable requests instead of tab-separated paragraphs', () => {
    const markdown = [
      '## Competitor Table',
      '',
      '| Competitor | Site | Hook |',
      '| --- | --- | --- |',
      '| GO! Coaching | example.com | Built brand |',
      '| Forward Academy | forward.com | Building online |',
    ].join('\n')

    const blocks = parseMarkdownBlocks(markdown)
    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'table',
          rows: [
            ['Competitor', 'Site', 'Hook'],
            ['GO! Coaching', 'example.com', 'Built brand'],
            ['Forward Academy', 'forward.com', 'Building online'],
          ],
        }),
      ]),
    )

    const requests = markdownToGoogleDocsTabRequests(markdown, 't.second')
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insertTable: {
            rows: 3,
            columns: 3,
            location: { index: expect.any(Number), tabId: 't.second' },
          },
        }),
      ]),
    )
    expect(JSON.stringify(requests)).not.toContain('GO! Coaching\texample.com')
  })

  it('offsets insertion and formatting ranges for a non-default insertion point', () => {
    const requests = markdownToGoogleDocsTabRequests('# Campaign Content', 't.abc', 40)
    expect(requests[0]).toEqual({
      insertText: {
        text: 'Campaign Content\n',
        location: { index: 40, tabId: 't.abc' },
      },
    })
    expect(requests[1]).toEqual(
      expect.objectContaining({
        updateParagraphStyle: expect.objectContaining({
          range: { startIndex: 40, endIndex: 57, tabId: 't.abc' },
          paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
        }),
      }),
    )
    expect(requests[2]).toEqual(
      expect.objectContaining({
        updateParagraphStyle: expect.objectContaining({
          range: { startIndex: 40, endIndex: 57, tabId: 't.abc' },
        }),
      }),
    )
  })

  it('uses the stable empty-table cell index layout', () => {
    expect(emptyTableCellIndex(1, 0, 0, 2)).toBe(5)
    expect(emptyTableCellIndex(1, 0, 1, 2)).toBe(7)
    expect(emptyTableCellIndex(1, 1, 0, 2)).toBe(10)
    expect(emptyTableEndIndex(1, 2, 2)).toBe(13)
  })
})
