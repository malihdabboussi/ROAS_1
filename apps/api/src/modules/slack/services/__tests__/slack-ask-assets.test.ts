import { describe, expect, it } from 'vitest'
import {
  buildSlackAskAssets,
  collectInboundSlackFiles,
  extractAssetLinks,
  formatSlackAskAssetsBlock,
} from '../slack-ask-assets'

describe('slack-ask-assets', () => {
  it('collects files from the message and from forwarded unfurls, deduped', () => {
    const files = collectInboundSlackFiles({
      files: [{ id: 'F1', name: 'a.pdf' }],
      attachments: [
        {
          text: 'fwd',
          files: [
            { id: 'F2', name: 'MFS_Elite.pdf' },
            { id: 'F1', name: 'a.pdf' },
          ],
        },
      ],
    })
    expect(files.map((file) => file.id)).toEqual(['F1', 'F2'])
  })

  it('extracts Drive/Docs/Figma links but never Slack-internal URLs', () => {
    const links = extractAssetLinks([
      'Brief: https://docs.google.com/document/d/abc/edit, folder https://drive.google.com/drive/folders/xyz.',
      'Source: https://roas.slack.com/archives/C1/p1 and https://files.slack.com/files-pri/T1-F1/x.pdf',
      'design https://www.figma.com/file/123',
    ])
    expect(links).toEqual([
      expect.objectContaining({
        kind: 'google_doc',
        url: 'https://docs.google.com/document/d/abc/edit',
      }),
      expect.objectContaining({
        kind: 'google_drive',
        url: 'https://drive.google.com/drive/folders/xyz',
      }),
      expect.objectContaining({ kind: 'figma', url: 'https://www.figma.com/file/123' }),
    ])
  })

  it('formats the [Assets] block with re-hosted files first and the SR rule (MFS_Elite.pdf fixture)', () => {
    const assets = buildSlackAskAssets({
      documents: [
        {
          filename: 'MFS_Elite.pdf',
          type: 'text',
          mimeType: 'application/pdf',
          fileUrl: 'https://storage.roas.io/campaigns/u1/slack/abc-MFS_Elite.pdf?token=x',
        },
      ],
      texts: ['please rebuild this, folder: https://drive.google.com/drive/folders/xyz'],
    })
    const block = formatSlackAskAssetsBlock(assets, {
      sourcePermalink: 'https://roas.slack.com/archives/C07JDT099AL/p1723600000000100',
    })
    expect(block.startsWith('[Assets]')).toBe(true)
    expect(block).toContain(
      '- MFS_Elite.pdf — https://storage.roas.io/campaigns/u1/slack/abc-MFS_Elite.pdf?token=x (pdf; re-hosted copy',
    )
    expect(block).toContain(
      '- google drive — https://drive.google.com/drive/folders/xyz (google_drive;',
    )
    expect(block).toContain(
      'Source thread (provenance only): https://roas.slack.com/archives/C07JDT099AL/p1723600000000100',
    )
    expect(block).toContain('source_context.assets')
    expect(formatSlackAskAssetsBlock([])).toBe('')
  })
})
