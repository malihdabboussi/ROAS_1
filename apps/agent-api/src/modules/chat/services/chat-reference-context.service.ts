import { Injectable, type Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type {
  ActiveArtifact,
  ActiveWorkingSet,
  RequestContextService,
} from '../../shared/services/request-context.service'
import { ChatAttachmentContextRepository } from '../repositories/chat-attachment-context.repository'
import { buildConversationReferenceLines } from './conversation-reference.util'

export interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

export interface MessageReference {
  kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person'
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

export interface UiSelectedArtifact {
  id: string
  type: string
  label?: string
  campaign_id?: string | null
  parent?: {
    type: string
    id: string
  } | null
}

@Injectable()
export class ChatReferenceContextService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly chatAttachmentContextRepository: ChatAttachmentContextRepository,
  ) {}

  async buildHighlightedArtifactsContext(
    artifacts: HighlightedArtifact[],
    logger: Pick<Logger, 'warn'>,
  ): Promise<string> {
    if (artifacts.length === 0) return ''
    const lines = [
      '\n\n---\n**USER-TAGGED ARTIFACTS (the user is specifically referring to these items — focus your response on them)**\n',
    ]

    const spaceItemTypes = new Set([
      'instagram-research',
      'tiktok-research',
      'youtube-research',
      'twitter-research',
      'space_doc',
    ])
    const resolvedIdByArtifactId = new Map<string, string>()
    for (const artifact of artifacts) {
      if (!spaceItemTypes.has(artifact.type) || !artifact.id.startsWith('media:')) continue
      const [, refSpaceId, refMediaId] = artifact.id.split(':')
      if (!refSpaceId || !refMediaId) continue
      const matchId = await this.chatAttachmentContextRepository.findSpaceItemIdByMediaReference(
        this.svc.client,
        { spaceId: refSpaceId, mediaId: refMediaId },
      )
      if (matchId) resolvedIdByArtifactId.set(artifact.id, matchId)
    }
    const resolveItemId = (artifact: HighlightedArtifact): string =>
      resolvedIdByArtifactId.get(artifact.id) ?? artifact.id

    const spaceItemIds = artifacts
      .filter((artifact) => spaceItemTypes.has(artifact.type))
      .map((artifact) => resolveItemId(artifact))
      .filter((id) => !id.startsWith('media:'))
    const spaceIdById = new Map<string, string>()
    const customDataByItemId = new Map<string, Record<string, unknown>>()
    if (spaceItemIds.length > 0) {
      const { data, error } = await this.chatAttachmentContextRepository.listSpaceItemsByIds(
        this.svc.client,
        spaceItemIds,
      )
      if (error) {
        logger.warn(`Failed to resolve space_id for highlighted artifacts: ${error.message}`)
      } else {
        for (const row of data ?? []) {
          if (typeof row.id === 'string' && typeof row.space_id === 'string') {
            spaceIdById.set(row.id, row.space_id)
          }
          if (
            typeof row.id === 'string' &&
            row.custom_data &&
            typeof row.custom_data === 'object' &&
            !Array.isArray(row.custom_data)
          ) {
            customDataByItemId.set(row.id, row.custom_data as Record<string, unknown>)
          }
        }
      }
    }

    const notificationIds = artifacts
      .filter((artifact) => artifact.type === 'notification')
      .map((artifact) => artifact.id)
    const notificationById = new Map<string, Record<string, unknown>>()
    if (notificationIds.length > 0) {
      const { data: notifRows, error: notifError } =
        await this.chatAttachmentContextRepository.listUserNotificationsByIds(
          this.svc.client,
          notificationIds,
        )
      if (notifError) {
        logger.warn(
          `Failed to resolve notifications for highlighted artifacts: ${notifError.message}`,
        )
      } else {
        for (const row of notifRows ?? []) {
          if (typeof row.id === 'string') notificationById.set(row.id, row)
        }
      }
      const missing = notificationIds.filter((id) => !notificationById.has(id))
      if (missing.length > 0) {
        const { data: awarenessRows, error: awarenessError } =
          await this.chatAttachmentContextRepository.listAwarenessPointsByIds(
            this.svc.client,
            missing,
          )
        if (awarenessError) {
          logger.warn(
            `Failed to resolve awareness points for highlighted artifacts: ${awarenessError.message}`,
          )
        } else {
          for (const row of awarenessRows ?? []) {
            if (typeof row.id === 'string')
              notificationById.set(row.id, { ...row, _kind: 'awareness' })
          }
        }
      }
    }

    for (const artifact of artifacts) {
      if (spaceItemTypes.has(artifact.type)) {
        const itemId = resolveItemId(artifact)
        if (itemId.startsWith('media:')) {
          lines.push(
            `- ${artifact.label} (type: ${artifact.type}, media_id: ${artifact.id.split(':')[2] ?? artifact.id} — still saving; retry get_task lookup by searching the space for this media_id if direct retrieval fails)`,
          )
          continue
        }
        const spaceId = spaceIdById.get(itemId)
        const customData = customDataByItemId.get(itemId)
        const postUrl =
          typeof customData?.post_url === 'string' && customData.post_url.trim()
            ? customData.post_url.trim()
            : null
        const analyzed =
          typeof customData?.analyzed_at === 'string' && customData.analyzed_at.length > 0
        const hasBreakdown = Boolean(customData?.video_breakdown)
        const hasComments =
          Array.isArray(customData?.comments) && (customData.comments as unknown[]).length > 0
        const hint =
          artifact.type === 'space_doc'
            ? spaceId
              ? `, retrieve_via: read_space_document(space_id="${spaceId}", document_id="${itemId}")`
              : `, retrieve_via: get_document(document_id="${itemId}") — fetch space_id via list_documents if missing`
            : spaceId
              ? `, retrieve_via: get_task(space_id="${spaceId}", task_id="${itemId}")`
              : `, retrieve_via: get_task(task_id="${itemId}") — fetch space_id via list_spaces if missing`
        const enrichments = [
          analyzed ? 'transcript, hook, caption, engagement, owner info' : null,
          hasBreakdown
            ? 'video_breakdown (formula deconstruction: topic, packaging, viewer questions, hook+setup, script structure, steal-this patterns)'
            : null,
          hasComments ? 'comments (top viewer comments with likes)' : null,
        ].filter(Boolean)
        const meta = [
          postUrl ? `post_url="${postUrl}"` : null,
          enrichments.length > 0
            ? `get_task returns full custom_data incl: ${enrichments.join('; ')}`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
        lines.push(
          `- ${artifact.label} (type: ${artifact.type}, id: ${itemId}${hint}${meta ? `, ${meta}` : ''})`,
        )
      } else if (artifact.type === 'notification') {
        const row = notificationById.get(artifact.id)
        if (!row) {
          lines.push(`- ${artifact.label} (type: notification, id: ${artifact.id})`)
          continue
        }
        if (row._kind === 'awareness') {
          const content = typeof row.content === 'string' ? row.content : artifact.label
          const pointType = typeof row.point_type === 'string' ? row.point_type : 'awareness'
          lines.push(
            `- Awareness (${pointType}): ${content} (type: notification, id: ${artifact.id}, source: agent_awareness_points)`,
          )
        } else {
          const title = typeof row.title === 'string' ? row.title : artifact.label
          const body = typeof row.body === 'string' && row.body.trim() ? row.body.trim() : null
          const nType = typeof row.type === 'string' ? row.type : 'notification'
          lines.push(
            `- Notification [${nType}]: ${title}${body ? ` — ${body}` : ''} (type: notification, id: ${artifact.id}, source: user_notifications)`,
          )
        }
      } else {
        lines.push(`- ${artifact.label} (type: ${artifact.type}, id: ${artifact.id})`)
      }
    }
    return lines.join('\n')
  }

  seedActiveWorkingSet(
    params: {
      conversationId: string
      campaignId: string | null
      highlightedArtifacts?: HighlightedArtifact[]
      messageReferences?: MessageReference[]
      uiSelectedArtifact?: UiSelectedArtifact
    },
    requestContext: RequestContextService,
  ): void {
    const now = Date.now()
    for (const artifact of params.highlightedArtifacts ?? []) {
      const type = this.normalizeArtifactType(artifact.type)
      if (!type || !artifact.id.trim()) continue
      requestContext.setActiveArtifact(params.conversationId, {
        type,
        id: artifact.id,
        label: artifact.label,
        campaign_id: params.campaignId,
        parent: null,
        source: 'user_attached',
        updated_at: now,
      })
    }
    for (const reference of params.messageReferences ?? []) {
      if (reference.kind !== 'artifact') continue
      const type = this.normalizeArtifactType(reference.type)
      if (!type || !reference.id.trim()) continue
      requestContext.setActiveArtifact(params.conversationId, {
        type,
        id: reference.id,
        label: reference.label,
        campaign_id: reference.campaign_id ?? params.campaignId,
        parent: null,
        source: 'user_attached',
        updated_at: now,
      })
    }
    const selectedType = this.normalizeArtifactType(params.uiSelectedArtifact?.type)
    if (params.uiSelectedArtifact && selectedType && params.uiSelectedArtifact.id.trim()) {
      requestContext.setActiveArtifact(params.conversationId, {
        type: selectedType,
        id: params.uiSelectedArtifact.id,
        label: params.uiSelectedArtifact.label,
        campaign_id: params.uiSelectedArtifact.campaign_id ?? params.campaignId,
        parent:
          params.uiSelectedArtifact.parent &&
          this.normalizeArtifactType(params.uiSelectedArtifact.parent.type) &&
          params.uiSelectedArtifact.parent.id.trim()
            ? {
                type: this.normalizeArtifactType(params.uiSelectedArtifact.parent.type)!,
                id: params.uiSelectedArtifact.parent.id,
              }
            : null,
        source: 'ui_selected',
        updated_at: now,
      })
      if (params.uiSelectedArtifact.parent) {
        const parentType = this.normalizeArtifactType(params.uiSelectedArtifact.parent.type)
        if (parentType && params.uiSelectedArtifact.parent.id.trim()) {
          requestContext.setActiveArtifact(params.conversationId, {
            type: parentType,
            id: params.uiSelectedArtifact.parent.id,
            campaign_id: params.uiSelectedArtifact.campaign_id ?? params.campaignId,
            parent: null,
            source: 'ui_selected',
            updated_at: now,
          })
        }
      }
    }
  }

  hasActiveWorkingSetEntries(workingSet: ActiveWorkingSet): boolean {
    if (workingSet.lastTouched) return true
    return Object.values(workingSet.byType).some((items) => items.length > 0)
  }

  seedActiveWorkingSetFromMetadata(
    conversationId: string,
    metadata: unknown,
    requestContext: RequestContextService,
  ): void {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return
    const workingSet = this.parseStoredActiveWorkingSet(
      (metadata as Record<string, unknown>).active_working_set,
    )
    if (!workingSet || !this.hasActiveWorkingSetEntries(workingSet)) return
    requestContext.replaceActiveWorkingSet(conversationId, workingSet)
  }

  async buildMessageReferencesContext(
    references: MessageReference[],
    userId: string,
    orgId?: string,
  ): Promise<string> {
    const MAX_REFS = 10
    const refs = references.slice(0, MAX_REFS)
    if (refs.length === 0) return ''

    const serviceClient = this.svc.client
    const lines: string[] = [
      '\n\n---\n**USER @ REFERENCES (the user explicitly tagged these items — focus your response on them)**\n',
    ]

    const mediaRefs = refs.filter((ref) => ref.kind === 'media')
    const missionRefs = refs.filter((ref) => ref.kind === 'mission')
    const artifactRefs = refs.filter((ref) => ref.kind === 'artifact')
    const conversationRefs = refs.filter((ref) => ref.kind === 'conversation')
    const personRefs = refs.filter((ref) => ref.kind === 'person')

    for (const artifact of artifactRefs) {
      const crossNote = artifact.campaign_id ? `, cross-campaign: ${artifact.campaign_id}` : ''
      lines.push(
        `- [Artifact] ${artifact.label} (type: ${artifact.type ?? 'unknown'}, id: ${artifact.id}${crossNote})`,
      )
    }

    if (mediaRefs.length > 0) {
      const mediaIds = mediaRefs.map((ref) => ref.id)
      const mediaRows = await this.chatAttachmentContextRepository.listMediaReferences(
        serviceClient,
        {
          userId,
          mediaIds,
          limit: MAX_REFS,
        },
      )
      const mediaMap = new Map(
        (mediaRows ?? []).map((row: Record<string, unknown>) => [row.id as string, row]),
      )
      for (const ref of mediaRefs) {
        const row = mediaMap.get(ref.id) as Record<string, unknown> | undefined
        const crossNote = ref.campaign_id ? `, cross-campaign: ${ref.campaign_id}` : ''
        if (row) {
          lines.push(
            `- [Media] ${row.name ?? row.original_filename ?? ref.label} (type: ${row.mime_type ?? 'unknown'}, url: ${row.public_url ?? 'N/A'}, id: ${ref.id}${crossNote})`,
          )
        } else {
          lines.push(`- [Media] ${ref.label} (id: ${ref.id}${crossNote})`)
        }
      }
    }

    if (missionRefs.length > 0) {
      const missionIds = missionRefs.map((ref) => ref.id)
      const missionRows = await this.chatAttachmentContextRepository.listMissionReferences(
        serviceClient,
        {
          userId,
          missionIds,
          limit: MAX_REFS,
        },
      )
      const missionMap = new Map(
        (missionRows ?? []).map((row: Record<string, unknown>) => [row.id as string, row]),
      )
      for (const ref of missionRefs) {
        const row = missionMap.get(ref.id) as Record<string, unknown> | undefined
        const crossNote = ref.campaign_id ? `, cross-campaign: ${ref.campaign_id}` : ''
        if (row) {
          lines.push(
            `- [Mission] ${row.title ?? ref.label} (status: ${row.status ?? 'unknown'}, agent: ${row.assigned_agent_key ?? 'unassigned'}, id: ${ref.id}${crossNote})`,
          )
        } else {
          lines.push(`- [Mission] ${ref.label} (id: ${ref.id}${crossNote})`)
        }
      }
    }

    if (conversationRefs.length > 0) {
      const conversationLines = await buildConversationReferenceLines(
        serviceClient,
        conversationRefs.map((ref) => ({ id: ref.id, label: ref.label })),
        userId,
        orgId ?? null,
      )
      lines.push(...conversationLines)
    }

    if (personRefs.length > 0 && orgId) {
      const managedRefs = personRefs.filter((ref) => ref.type === 'managed_person')
      const portalRefs = personRefs.filter((ref) => ref.type === 'portal_user')
      const [managedRows, portalRows, defaultUserBrains] = await Promise.all([
        this.chatAttachmentContextRepository.listManagedPersonReferences(serviceClient, {
          orgId,
          personIds: managedRefs.map((ref) => ref.id),
          limit: MAX_REFS,
        }),
        this.chatAttachmentContextRepository.listPortalPersonReferences(serviceClient, {
          orgId,
          userIds: portalRefs.map((ref) => ref.id),
          limit: MAX_REFS,
        }),
        this.chatAttachmentContextRepository.listDefaultUserBrainReferences(
          serviceClient,
          portalRefs.map((ref) => ref.id),
        ),
      ])
      const managedById = new Map(managedRows.map((row) => [String(row.id ?? ''), row]))
      const portalById = new Map(portalRows.map((row) => [String(row.user_id ?? ''), row]))
      const brainByOwnerId = new Map(
        defaultUserBrains.map((brain) => [String(brain.owner_id ?? ''), brain]),
      )
      for (const ref of personRefs) {
        const managedRow = managedById.get(ref.id)
        const portalRow = portalById.get(ref.id)
        if (!managedRow && !portalRow) continue
        const portalBrain = brainByOwnerId.get(ref.id)
        const name = String(
          managedRow?.display_name ?? portalRow?.display_name ?? 'Organization person',
        )
        const role = String(managedRow?.title ?? portalRow?.role_label ?? '').trim()
        const relationship = String(managedRow?.relationship_kind ?? '').trim()
        const brainId = String(managedRow?.person_brain_id ?? portalBrain?.id ?? '').trim()
        const details = [
          role || null,
          relationship || null,
          brainId ? `Person Brain: ${brainId}` : null,
        ].filter(Boolean)
        lines.push(`- [Person] ${name}${details.length ? ` (${details.join(', ')})` : ''}`)
      }
    }

    return lines.join('\n')
  }

  normalizeArtifactType(value: string | undefined): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().replace(/-/g, '_')
    return normalized.length > 0 ? normalized : null
  }

  parseStoredActiveWorkingSet(value: unknown): ActiveWorkingSet | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    const rawByType = record.byType
    if (!rawByType || typeof rawByType !== 'object' || Array.isArray(rawByType)) return null
    const byType: ActiveWorkingSet['byType'] = {}
    for (const [type, rawItems] of Object.entries(rawByType as Record<string, unknown>)) {
      if (!Array.isArray(rawItems)) continue
      const items: ActiveArtifact[] = rawItems
        .filter((item): item is Record<string, unknown> => {
          return !!item && typeof item === 'object' && !Array.isArray(item)
        })
        .map((item): ActiveArtifact | null => {
          const itemType = this.normalizeArtifactType(String(item.type ?? type))
          const id = typeof item.id === 'string' ? item.id.trim() : ''
          if (!itemType || !id) return null
          const parent =
            item.parent && typeof item.parent === 'object' && !Array.isArray(item.parent)
              ? (item.parent as Record<string, unknown>)
              : null
          const parentType = this.normalizeArtifactType(String(parent?.type ?? ''))
          const parentId = typeof parent?.id === 'string' ? parent.id.trim() : ''
          return {
            type: itemType,
            id,
            ...(typeof item.label === 'string' ? { label: item.label } : {}),
            campaign_id: typeof item.campaign_id === 'string' ? item.campaign_id : null,
            parent: parentType && parentId ? { type: parentType, id: parentId } : null,
            source: 'recent_history',
            updated_at: typeof item.updated_at === 'number' ? item.updated_at : Date.now(),
          }
        })
        .filter((item): item is ActiveArtifact => item !== null)
      if (items.length > 0) byType[type] = items
    }
    const lastTouchedRaw = record.lastTouched
    const lastTouched =
      lastTouchedRaw && typeof lastTouchedRaw === 'object' && !Array.isArray(lastTouchedRaw)
        ? (this.parseStoredActiveWorkingSet({ byType: { __last: [lastTouchedRaw] } })?.byType
            .__last?.[0] ?? null)
        : null
    return { byType, lastTouched }
  }
}
