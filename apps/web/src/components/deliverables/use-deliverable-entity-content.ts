'use client'

import { useEffect, useState } from 'react'
import {
  ENTITY_ARTIFACT_TYPE_MAP,
  TEXT_TYPES,
} from '@/components/deliverables/deliverable-preview-modal.constants'
import {
  fetchAd,
  fetchAvatar,
  fetchDocument,
  fetchEmailArtifact,
  fetchOffer,
  fetchPresentation,
  fetchSequence,
  fetchSocialPost,
  avatarToText,
  offerToText,
  presentationToText,
  sequenceToText,
} from '@/lib/artifacts'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'
import type { MissionDeliverable } from '@/lib/missions'

export function useDeliverableEntityContent(deliverable: MissionDeliverable) {
  const isEntityType = !!deliverable.entity_id && !!ENTITY_ARTIFACT_TYPE_MAP[deliverable.type]
  const isTextType = TEXT_TYPES.has(deliverable.type)
  const isTextContent = !deliverable.file_url && !!deliverable.content
  const hasSourcePdfFile =
    !!deliverable.file_url &&
    (deliverable.type === 'pdf' ||
      deliverable.mime_type?.toLowerCase().includes('pdf') === true ||
      deliverable.file_name?.toLowerCase().endsWith('.pdf') === true)

  const [entityTextContent, setEntityTextContent] = useState<string | null>(null)
  const [entityData, setEntityData] = useState<unknown>(null)
  const [entityContentLoading, setEntityContentLoading] = useState(false)

  useEffect(() => {
    if (!isEntityType || !deliverable.entity_id) {
      setEntityContentLoading(false)
      return
    }
    if (deliverable.entity_table === 'space_items' && deliverable.type === 'doc') {
      setEntityContentLoading(false)
      return
    }
    let cancelled = false
    const entityId = deliverable.entity_id
    const t = deliverable.type
    setEntityContentLoading(true)
    setEntityTextContent(null)
    setEntityData(null)

    const load = async () => {
      try {
        let text: string | null = null
        let data: unknown = null
        if (t === 'offer') {
          const entity = await fetchOffer(entityId)
          data = entity
          text = offerToText(entity)
        } else if (t === 'avatar') {
          const entity = await fetchAvatar(entityId)
          data = entity
          text = avatarToText(entity)
        } else if (t === 'sequence') {
          const entity = await fetchSequence(entityId)
          data = entity
          text = sequenceToText(entity)
        } else if (t === 'email') {
          const entity = await fetchEmailArtifact(entityId)
          data = entity
          text = [`Subject: ${entity.subject}`, entity.body].filter(Boolean).join('\n\n')
        } else if (t === 'presentation') {
          const entity = await fetchPresentation(entityId)
          data = entity
          text = presentationToText(entity)
        } else if (t === 'social_post') {
          const entity = await fetchSocialPost(entityId)
          data = entity
          const parts = [
            entity.caption,
            entity.hashtags?.map((h: string) => `#${h}`).join(' '),
          ].filter(Boolean)
          text = parts.join('\n\n') || null
        } else if (t === 'ad') {
          const entity = await fetchAd(entityId)
          data = entity
          const parts = [entity.primary_text, entity.headline].filter(Boolean)
          text = parts.join('\n\n') || null
        } else if (t === 'doc') {
          const doc = await fetchDocument(entityId)
          data = doc
          const { content } = doc
          const direct =
            typeof content === 'string'
              ? content
              : content &&
                  typeof content === 'object' &&
                  typeof (content as { text?: unknown }).text === 'string'
                ? (content as { text: string }).text
                : null
          text = direct?.trim() ? direct : extractMarkdownFromDocumentContent(content as unknown)
        }
        if (!cancelled) {
          if (text) setEntityTextContent(text)
          if (data) setEntityData(data)
        }
      } catch {
        /* entity text is best-effort */
      } finally {
        if (!cancelled) setEntityContentLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isEntityType, deliverable.entity_id, deliverable.type, deliverable.entity_table])

  const effectiveContent = deliverable.content || entityTextContent

  return {
    entityTextContent,
    entityData,
    entityContentLoading,
    effectiveContent,
    isEntityType,
    isTextType,
    isTextContent,
    hasSourcePdfFile,
  }
}
