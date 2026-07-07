import { describe, expect, it, vi } from 'vitest'
import { resolveDocMentionLinkPreviews } from './resolve-doc-mention-previews'

function makeSupabase(row: Record<string, unknown> | null) {
  const supabase = {}
  const repository = {
    findDocMentionPreviewItemById: vi.fn().mockResolvedValue({ data: row, error: null }),
  }
  return { supabase, repository }
}

describe('resolveDocMentionLinkPreviews', () => {
  it('builds an internal preview for doc entity mentions', async () => {
    const { repository, supabase } = makeSupabase({
      id: 'doc-1',
      space_id: 'space-1',
      title: 'Launch Doc',
      doc_body: '<h1>Plan</h1><p>Launch the offer.</p>',
      custom_data: { _view_type: 'doc', _doc_cover_url: 'https://example.com/cover.png' },
    })
    const linkPreview = { resolveMany: vi.fn() }

    const result = await resolveDocMentionLinkPreviews(
      repository,
      supabase as never,
      linkPreview as never,
      { userId: 'user-1', orgId: null },
      [{ type: 'doc', entity_id: 'doc-1', label: 'Mention Label' }],
    )

    expect(result).toEqual([
      {
        url: '/spaces/space-1/doc-1',
        provider: 'internal',
        title: 'Mention Label',
        description: 'Plan Launch the offer.',
        imageUrl: 'https://example.com/cover.png',
        iconUrl: null,
        siteName: 'Vibey',
        entityKind: 'space-item',
        entityId: 'doc-1',
        mimeType: 'text/html',
      },
    ])
    expect(linkPreview.resolveMany).not.toHaveBeenCalled()
  })

  it('uses drive link preview data when a drive-backed doc can be resolved', async () => {
    const { repository, supabase } = makeSupabase({
      id: 'doc-1',
      space_id: 'space-1',
      title: 'Launch Doc',
      doc_body: '<p>Body</p>',
      custom_data: { _view_type: 'doc', _drive_file_id: 'drive-file-1' },
    })
    const linkPreview = {
      resolveMany: vi.fn().mockResolvedValue([
        {
          url: 'https://drive.google.com/file/d/drive-file-1/view',
          provider: 'google-drive',
          title: null,
          description: null,
          imageUrl: null,
          iconUrl: null,
          siteName: 'Google Drive',
        },
      ]),
    }

    const result = await resolveDocMentionLinkPreviews(
      repository,
      supabase as never,
      linkPreview as never,
      { userId: 'user-1', orgId: 'org-1' },
      [{ type: 'doc', entity_id: 'doc-1', label: 'Drive Doc' }],
    )

    expect(linkPreview.resolveMany).toHaveBeenCalledWith(
      ['https://drive.google.com/file/d/drive-file-1/view'],
      {
        supabase,
        userId: 'user-1',
        orgId: 'org-1',
      },
    )
    expect(result[0]).toMatchObject({
      provider: 'google-drive',
      title: 'Drive Doc',
      entityKind: 'space-item',
      entityId: 'doc-1',
    })
  })
})
