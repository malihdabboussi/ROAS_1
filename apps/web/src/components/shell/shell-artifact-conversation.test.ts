import { describe, expect, it } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  removeLastArtifactByConversation,
  resolveArtifactForConversationChange,
  stampArtifactConversation,
  upsertLastArtifactByConversation,
} from './shell-artifact-conversation'

const docA: ShellArtifactViewerTarget = {
  id: 'doc-a',
  title: 'Brief A',
  type: 'doc',
}

const docB: ShellArtifactViewerTarget = {
  id: 'doc-b',
  title: 'Brief B',
  type: 'doc',
}

describe('shell-artifact-conversation', () => {
  it('stamps conversation ids onto targets', () => {
    expect(stampArtifactConversation(docA, 'conv-1').conversationId).toBe('conv-1')
    expect(stampArtifactConversation(docA, '  ').conversationId).toBeUndefined()
  })

  it('remembers the latest artifact per conversation', () => {
    const map = upsertLastArtifactByConversation({}, 'conv-1', docA)
    expect(map['conv-1']?.id).toBe('doc-a')
    expect(upsertLastArtifactByConversation(map, 'conv-1', docB)['conv-1']?.id).toBe('doc-b')
  })

  it('restores the chat artifact unless pinned', () => {
    const map = {
      'conv-1': stampArtifactConversation(docA, 'conv-1'),
      'conv-2': stampArtifactConversation(docB, 'conv-2'),
    }
    expect(
      resolveArtifactForConversationChange({
        artifactPinned: false,
        currentTarget: docA,
        lastArtifactByConversation: map,
        nextConversationId: 'conv-2',
      })?.id,
    ).toBe('doc-b')
    expect(
      resolveArtifactForConversationChange({
        artifactPinned: true,
        currentTarget: docA,
        lastArtifactByConversation: map,
        nextConversationId: 'conv-2',
      }),
    ).toEqual(docA)
    expect(
      resolveArtifactForConversationChange({
        artifactPinned: false,
        currentTarget: docA,
        lastArtifactByConversation: map,
        nextConversationId: 'conv-missing',
      }),
    ).toBeNull()
  })

  it('forgets a closed conversation artifact', () => {
    const map = upsertLastArtifactByConversation({}, 'conv-1', docA)
    expect(removeLastArtifactByConversation(map, 'conv-1')).toEqual({})
  })
})
