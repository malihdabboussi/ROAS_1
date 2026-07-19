import { describe, expect, it } from 'vitest'
import {
  markdownToGoogleDocsTabRequests,
  parseMarkdownBlocks,
} from '../markdown-to-google-docs-tab-requests'

describe('markdownToGoogleDocsTabRequests', () => {
  it('parses headings, bullets, and bold marks', () => {
    const blocks = parseMarkdownBlocks('# Title\n\n**Hello** world\n\n- One\n- Two')
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: 'Title', marks: [] },
      {
        kind: 'paragraph',
        text: 'Hello world',
        marks: [{ start: 0, end: 5, bold: true }],
      },
      { kind: 'bullet', text: 'One', marks: [] },
      { kind: 'bullet', text: 'Two', marks: [] },
    ])
  })

  it('builds insert + style requests for a tab', () => {
    const requests = markdownToGoogleDocsTabRequests('# Title\n\nBody with **bold**.', 't.abc')
    expect(requests[0]).toEqual({
      insertText: {
        text: 'Title\nBody with bold.\n',
        location: { index: 1, tabId: 't.abc' },
      },
    })
    expect(requests).toEqual(
      expect.arrayContaining([
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
})
