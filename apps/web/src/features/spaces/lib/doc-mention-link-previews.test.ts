import { describe, expect, it } from 'vitest'
import { docMentionPreviewsFromHtml, mergeCommentLinkPreviews } from './doc-mention-link-previews'

const docChip =
  '<span class="entity-chip" data-entity-kind="doc" data-entity-id="doc-1" data-entity-label="Launch Plan"></span>'

describe('doc mention link previews', () => {
  it('builds fallback previews from deduped document entity chips', () => {
    expect(docMentionPreviewsFromHtml(`${docChip}${docChip}`, 'space-1')).toEqual([
      {
        url: '/spaces/space-1/doc-1',
        provider: 'internal',
        title: 'Launch Plan',
        description: null,
        imageUrl: null,
        iconUrl: null,
        siteName: 'ROAS',
        entityKind: 'space-item',
        entityId: 'doc-1',
        mimeType: 'text/html',
      },
    ])
  })

  it('keeps payload previews and only adds uncovered doc mention fallbacks', () => {
    expect(
      mergeCommentLinkPreviews(
        [
          {
            url: '/spaces/space-1/doc-1',
            provider: 'internal',
            title: 'Existing',
            description: null,
            imageUrl: null,
            iconUrl: null,
            siteName: 'ROAS',
            entityKind: 'space-item',
            entityId: 'doc-1',
            mimeType: 'text/html',
          },
        ],
        docChip,
        'space-1',
      ),
    ).toHaveLength(1)
  })
})
