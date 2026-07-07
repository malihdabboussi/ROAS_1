import { describe, expect, it } from 'vitest'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { MessageReference } from '../../types'
import type { AtMentionItem } from './chat-input-at-mentions'
import {
  appendUniqueAttachedArtifact,
  appendUniqueMessageReference,
  buildAttachedArtifactFromAtMention,
  buildMessageReferenceFromAtMention,
  getAtCampaignSelectionTextUpdate,
  getAtMentionSelectionTextUpdate,
} from './chat-input-at-mention-selection'

const artifactItem = {
  id: 'artifact-1',
  label: 'Offer One',
  section: 'artifact',
  type: 'offer',
} satisfies AtMentionItem

describe('chat-input-at-mention-selection', () => {
  it('replaces a campaign mention query with a bare @ token for cross-campaign browsing', () => {
    expect(getAtCampaignSelectionTextUpdate('ask @camp today', 'ask @camp'.length)).toEqual({
      changed: true,
      nextText: 'ask @ today',
      cursor: 'ask @'.length,
    })
  })

  it('removes the active @ token when selecting a mention item', () => {
    expect(getAtMentionSelectionTextUpdate('use @offer please', 'use @offer'.length)).toEqual({
      nextText: 'use  please',
      cursor: 'use '.length,
    })
  })

  it('leaves text unchanged when no @ token is active', () => {
    expect(getAtMentionSelectionTextUpdate('plain text', 'plain text'.length)).toEqual({
      nextText: 'plain text',
      cursor: 'plain text'.length,
    })
    expect(getAtCampaignSelectionTextUpdate('plain text', 'plain text'.length)).toEqual({
      changed: false,
      nextText: 'plain text',
      cursor: 'plain text'.length,
    })
  })

  it('builds message references and preserves source campaign ids', () => {
    expect(buildMessageReferenceFromAtMention(artifactItem, 'campaign-2')).toEqual({
      kind: 'artifact',
      id: 'artifact-1',
      label: 'Offer One',
      type: 'offer',
      campaign_id: 'campaign-2',
    })
  })

  it('appends references and local artifacts once', () => {
    const reference = buildMessageReferenceFromAtMention(artifactItem)
    const existingReferences: MessageReference[] = [reference]
    expect(appendUniqueMessageReference(existingReferences, reference)).toBe(existingReferences)

    const artifact = buildAttachedArtifactFromAtMention(artifactItem)
    expect(artifact).toEqual({ id: 'artifact-1', type: 'offer', label: 'Offer One' })
    const existingArtifacts: AttachedArtifact[] = [artifact!]
    expect(appendUniqueAttachedArtifact(existingArtifacts, artifact)).toBe(existingArtifacts)
  })

  it('does not attach a local artifact chip for cross-campaign or non-artifact mentions', () => {
    expect(buildAttachedArtifactFromAtMention(artifactItem, 'campaign-2')).toBeNull()
    expect(
      buildAttachedArtifactFromAtMention({
        id: 'mission-1',
        label: 'Mission',
        section: 'mission',
        type: 'active',
      }),
    ).toBeNull()
  })
})
