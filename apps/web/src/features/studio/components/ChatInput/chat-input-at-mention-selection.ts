import type { MessageReference } from '../../types'
import { getAtTokenAtCursor } from '../../utils/textarea-caret-viewport'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AtMentionItem } from './chat-input-at-mentions'

type ReferenceAtMentionItem = AtMentionItem & {
  section: Exclude<AtMentionItem['section'], 'space-task'>
}

export function isReferenceAtMentionItem(item: AtMentionItem): item is ReferenceAtMentionItem {
  return item.section !== 'space-task'
}

interface AtMentionTextUpdate {
  nextText: string
  cursor: number
}

interface AtCampaignTextUpdate extends AtMentionTextUpdate {
  changed: boolean
}

export function getAtCampaignSelectionTextUpdate(
  text: string,
  cursor: number,
): AtCampaignTextUpdate {
  const safeCursor = Math.min(cursor, text.length)
  const token = getAtTokenAtCursor(text, safeCursor)
  if (!token) {
    return { changed: false, nextText: text, cursor: text.length }
  }
  return {
    changed: true,
    nextText: text.slice(0, token.from) + '@' + text.slice(safeCursor),
    cursor: token.from + 1,
  }
}

export function getAtMentionSelectionTextUpdate(text: string, cursor: number): AtMentionTextUpdate {
  const safeCursor = Math.min(cursor, text.length)
  const token = getAtTokenAtCursor(text, safeCursor)
  if (!token) return { nextText: text, cursor: text.length }
  return {
    nextText: text.slice(0, token.from) + text.slice(safeCursor),
    cursor: token.from,
  }
}

export function buildMessageReferenceFromAtMention(
  item: ReferenceAtMentionItem,
  sourceCampaignId?: string,
): MessageReference {
  return {
    kind: item.section,
    id: item.id,
    label: item.label,
    type: item.type,
    ...(item.section === 'person' && item.brainId ? { brain_id: item.brainId } : {}),
    ...(sourceCampaignId ? { campaign_id: sourceCampaignId } : {}),
  }
}

export function appendUniqueMessageReference(
  references: MessageReference[],
  reference: MessageReference,
): MessageReference[] {
  return references.some((item) => item.id === reference.id && item.kind === reference.kind)
    ? references
    : [...references, reference]
}

export function buildAttachedArtifactFromAtMention(
  item: AtMentionItem,
  sourceCampaignId?: string,
): AttachedArtifact | null {
  if (item.section !== 'artifact' || sourceCampaignId) return null
  return {
    id: item.id,
    type: (item.type ?? 'document') as AttachedArtifact['type'],
    label: item.label,
  }
}

export function appendUniqueAttachedArtifact(
  artifacts: AttachedArtifact[],
  artifact: AttachedArtifact | null,
): AttachedArtifact[] {
  if (!artifact) return artifacts
  return artifacts.some((item) => item.id === artifact.id) ? artifacts : [...artifacts, artifact]
}
