import { describe, expect, it } from 'vitest'
import {
  buildStudioArtifactNavRows,
  buildStudioMediaNavRows,
  groupStudioArtifactItems,
  groupStudioMediaItems,
  mediaHeadingForBucket,
  sortMediaBucketKeys,
  studioMediaBucketKey,
  type AtMentionItem,
} from './chat-input-at-mentions'

function item(id: string, type?: string, thumbnailUrl?: string): AtMentionItem {
  return {
    id,
    label: id,
    section: thumbnailUrl ? 'media' : 'artifact',
    type,
    thumbnailUrl,
  }
}

describe('chat input at-mention grouping', () => {
  it('groups artifact items by type with stable headings and other last', () => {
    const groups = groupStudioArtifactItems([
      item('other'),
      item('offer-1', 'offer'),
      item('funnel-1', 'funnel'),
      item('custom-1', 'press_kit'),
    ])

    expect(groups.map((group) => [group.typeKey, group.heading])).toEqual([
      ['funnel', 'Funnels'],
      ['offer', 'Offers'],
      ['press_kit', 'Press Kit'],
      ['_other', 'Other'],
    ])
  })

  it('builds collapsed and preview-limited artifact navigation rows', () => {
    const groups = [
      {
        typeKey: 'offer',
        heading: 'Offers',
        items: Array.from({ length: 7 }, (_, index) => item(`offer-${index}`, 'offer')),
      },
      { typeKey: 'funnel', heading: 'Funnels', items: [item('funnel-1', 'funnel')] },
    ]

    expect(buildStudioArtifactNavRows(groups, { offer: true }, {})).toEqual([
      { kind: 'header', typeKey: 'offer', heading: 'Offers', count: 7, collapsed: true },
      { kind: 'header', typeKey: 'funnel', heading: 'Funnels', count: 1, collapsed: false },
      { kind: 'artifact-item', item: groups[1]!.items[0]! },
    ])

    const expandedRows = buildStudioArtifactNavRows(groups, {}, {})
    expect(expandedRows.filter((row) => row.kind === 'artifact-item')).toHaveLength(6)
    expect(expandedRows).toContainEqual({ kind: 'artifact-more', typeKey: 'offer', remaining: 2 })
  })

  it('buckets media items by mime type or thumbnail extension in display order', () => {
    const mediaItems = [
      item('doc', 'application/pdf'),
      item('video', 'video/mp4'),
      item('image', 'image/png'),
      item('audio', 'audio/mpeg'),
      item('sheet', 'application/vnd.ms-excel'),
      item('url-image', undefined, 'https://cdn.test/file.webp'),
      item('other', 'application/octet-stream'),
    ]

    expect(mediaItems.map(studioMediaBucketKey)).toEqual([
      'pdf',
      'video',
      'image',
      'audio',
      'document',
      'image',
      '_other',
    ])
    expect(sortMediaBucketKeys(['_other', 'document', 'image', 'audio', 'video', 'pdf'])).toEqual([
      'image',
      'video',
      'audio',
      'pdf',
      'document',
      '_other',
    ])
    expect(mediaHeadingForBucket('document')).toBe('Documents')
  })

  it('builds media navigation rows with more rows after the preview cap', () => {
    const groups = groupStudioMediaItems(
      Array.from({ length: 6 }, (_, index) => item(`image-${index}`, 'image/png')),
    )
    const rows = buildStudioMediaNavRows(groups, {}, {})

    expect(rows[0]).toEqual({ kind: 'header', typeKey: 'image', heading: 'Images', count: 6, collapsed: false })
    expect(rows.filter((row) => row.kind === 'media-item')).toHaveLength(5)
    expect(rows.at(-1)).toEqual({ kind: 'media-more', typeKey: 'image', remaining: 1 })
  })
})
