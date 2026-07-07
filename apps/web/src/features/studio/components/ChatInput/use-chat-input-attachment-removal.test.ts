import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import { useChatInputAttachmentRemoval } from './use-chat-input-attachment-removal'

describe('useChatInputAttachmentRemoval', () => {
  it('removes an artifact chip and matching artifact/conversation references', () => {
    const setAttachedArtifacts = vi.fn()
    const setAttachedReferences = vi.fn()
    const { result } = renderHook(() =>
      useChatInputAttachmentRemoval({ setAttachedArtifacts, setAttachedReferences }),
    )

    result.current.handleArtifactRemove('artifact-1')

    const artifactUpdater = setAttachedArtifacts.mock.calls[0]?.[0] as (
      artifacts: AttachedArtifact[],
    ) => AttachedArtifact[]
    const referenceUpdater = setAttachedReferences.mock.calls[0]?.[0] as (
      references: MessageReference[],
    ) => MessageReference[]
    expect(
      artifactUpdater([
        { id: 'artifact-1', type: 'offer', label: 'Offer' },
        { id: 'artifact-2', type: 'offer', label: 'Other' },
      ]),
    ).toEqual([{ id: 'artifact-2', type: 'offer', label: 'Other' }])
    expect(
      referenceUpdater([
        { kind: 'artifact', id: 'artifact-1', label: 'Offer' },
        { kind: 'conversation', id: 'artifact-1', label: 'Thread' },
        { kind: 'media', id: 'artifact-1', label: 'Image' },
      ]),
    ).toEqual([{ kind: 'media', id: 'artifact-1', label: 'Image' }])
  })

  it('removes only the matching reference id and kind', () => {
    const setAttachedArtifacts = vi.fn()
    const setAttachedReferences = vi.fn()
    const { result } = renderHook(() =>
      useChatInputAttachmentRemoval({ setAttachedArtifacts, setAttachedReferences }),
    )

    result.current.handleReferenceRemove({ kind: 'media', id: 'media-1', label: 'Image' })

    const referenceUpdater = setAttachedReferences.mock.calls[0]?.[0] as (
      references: MessageReference[],
    ) => MessageReference[]
    expect(
      referenceUpdater([
        { kind: 'media', id: 'media-1', label: 'Image' },
        { kind: 'artifact', id: 'media-1', label: 'Offer' },
        { kind: 'media', id: 'media-2', label: 'Other' },
      ]),
    ).toEqual([
      { kind: 'artifact', id: 'media-1', label: 'Offer' },
      { kind: 'media', id: 'media-2', label: 'Other' },
    ])
    expect(setAttachedArtifacts).not.toHaveBeenCalled()
  })
})
