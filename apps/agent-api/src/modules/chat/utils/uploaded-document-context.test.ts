import { describe, expect, it } from 'vitest'
import { buildUploadedDocumentContext } from './uploaded-document-context'

describe('buildUploadedDocumentContext', () => {
  it('prints the hosted source_url so the model can hand the file on (Service Request assets)', () => {
    const context = buildUploadedDocumentContext([
      {
        filename: 'MFS_Elite.pdf',
        type: 'text',
        text: 'Elite program outline',
        fileUrl: 'https://storage.roas.io/campaigns/u1/slack/abc-MFS_Elite.pdf?token=x',
      },
      {
        filename: 'notes.docx',
        type: 'text',
        fileUrl: 'https://storage.roas.io/campaigns/u1/slack/notes.docx',
        documentIntelligence: { status: 'failed', reason: 'unsupported' } as never,
      },
    ])
    expect(context).toContain(
      '### MFS_Elite.pdf\n- source_url: https://storage.roas.io/campaigns/u1/slack/abc-MFS_Elite.pdf?token=x\n```\nElite program outline\n```',
    )
    expect(context).toContain(
      '### notes.docx\n- source_url: https://storage.roas.io/campaigns/u1/slack/notes.docx\n',
    )
  })

  it('omits the line when there is no hosted url', () => {
    const context = buildUploadedDocumentContext([{ filename: 'a.txt', type: 'text', text: 'hi' }])
    expect(context).not.toContain('source_url')
  })
})
