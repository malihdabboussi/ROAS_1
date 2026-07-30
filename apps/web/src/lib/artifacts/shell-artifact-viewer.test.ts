import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArtifactPreviewType } from './artifact-preview-types'
import {
  openArtifactPreviewInShell,
  openDocumentInShell,
  SHELL_ARTIFACT_OPEN_EVENT,
  type ShellArtifactViewerTarget,
} from './shell-artifact-viewer'

const expectedTargets: Array<[ArtifactPreviewType, ShellArtifactViewerTarget['type'], string]> = [
  ['offer', 'offer', 'offers'],
  ['funnel', 'funnel', 'funnels'],
  ['avatar', 'avatar', 'avatars'],
  ['sequence', 'sequence', 'sequences'],
  ['presentation', 'presentation', 'presentations'],
  ['ad', 'ad', 'ads'],
  ['ad-set', 'ad_set', 'ad_sets'],
  ['ad-campaign', 'ad_campaign', 'ad_campaigns'],
  ['social-post', 'social_post', 'social_posts'],
  ['blog-post', 'blog_post', 'blog_posts'],
  ['email', 'email', 'emails'],
  ['visual-doc', 'visual_doc', 'space_items'],
  ['form', 'form', 'forms'],
  ['task', 'task', 'space_items'],
  ['mission', 'mission', 'missions'],
  ['flow', 'flow', 'space_automations'],
  ['website', 'website', 'funnels'],
  ['theme', 'theme', 'themes'],
  ['custom-object', 'custom_object', 'space_items'],
]

describe('chat artifact shell routing', () => {
  const listener = vi.fn()

  beforeEach(() => {
    listener.mockClear()
  })

  it.each(expectedTargets)(
    'routes %s cards to the canonical %s entity preview',
    (artifactType, deliverableType, entityTable) => {
      window.addEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)

      openArtifactPreviewInShell({
        artifactType,
        artifactId: 'artifact-1',
        name: 'Created output',
        spaceId: 'space-1',
      })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            id: 'artifact-1',
            entityId: 'artifact-1',
            entityTable,
            spaceId: 'space-1',
            title: 'Created output',
            type: deliverableType,
          }),
        }),
      )
      window.removeEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)
    },
  )

  it('routes missions and flows to their exact canonical URLs', () => {
    window.addEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)

    openArtifactPreviewInShell({
      artifactType: 'mission',
      artifactId: 'mission 1',
      name: 'Mission',
    })
    openArtifactPreviewInShell({
      artifactType: 'flow',
      artifactId: 'flow 1',
      name: 'Flow',
      spaceId: 'space 1',
    })

    expect(listener.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({ internalUrl: '/home?mission=mission%201' }),
      }),
    )
    expect(listener.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          internalUrl: '/flows?flow_id=flow%201&space_id=space%201',
        }),
      }),
    )
    window.removeEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)
  })

  it('routes conversation and Space documents to their canonical document hosts', () => {
    window.addEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)

    openDocumentInShell({ documentId: 'doc-1', title: 'Conversation doc' })
    openDocumentInShell({
      documentId: 'doc-2',
      title: 'Space doc',
      spaceId: 'space-1',
      spaceItemId: 'item-1',
    })

    expect(listener.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          entityId: 'doc-1',
          entityTable: 'conversation_documents',
          type: 'doc',
        }),
      }),
    )
    expect(listener.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          entityId: 'item-1',
          entityTable: 'space_items',
          spaceId: 'space-1',
          type: 'doc',
        }),
      }),
    )
    window.removeEventListener(SHELL_ARTIFACT_OPEN_EVENT, listener)
  })
})
