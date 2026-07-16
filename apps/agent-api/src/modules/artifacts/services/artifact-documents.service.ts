import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isTransientNetworkError } from '@vibey/api-shared'
import { ArtifactDocumentFilesRepository } from '../repositories/artifact-document-files.repository'
import { ArtifactDocumentsRepository } from '../repositories/artifact-documents.repository'
import { markdownToHtml } from '../utils/markdown-to-html.util'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactDocumentMissionDeliverablesService } from './artifact-document-mission-deliverables.service'
import {
  ArtifactDocumentSpaceDocsService,
  type SpaceDocRow,
} from './artifact-document-space-docs.service'
import { createSpaceDocItem, resolveDocumentSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactDocumentsService {
  private readonly missionDeliverables: ArtifactDocumentMissionDeliverablesService
  private readonly spaceDocs: ArtifactDocumentSpaceDocsService

  constructor(
    private readonly documentFilesRepository: ArtifactDocumentFilesRepository = new ArtifactDocumentFilesRepository(),
    private readonly documentsRepository: ArtifactDocumentsRepository = new ArtifactDocumentsRepository(),
  ) {
    this.missionDeliverables = new ArtifactDocumentMissionDeliverablesService(
      this.documentFilesRepository,
    )
    this.spaceDocs = new ArtifactDocumentSpaceDocsService(this.documentsRepository)
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async runReadWithRetry<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query()
    } catch (error) {
      if (!isTransientNetworkError(error)) throw error
      await this.sleep(250)
      return await query()
    }
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_documents: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'listDocuments',
          () => this.listDocuments(target, data, sessionKey),
          data,
          sessionKey,
        ),
      save_document: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'saveDocument',
          () => this.saveDocument(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_document: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getDocument',
          () => this.getDocument(target, data, sessionKey),
          data,
          sessionKey,
        ),
      read_space_document: (data, sessionKey) =>
        this.spaceDocs.readSpaceDocument(target, data, sessionKey),
      update_document: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateDocument',
          () => this.updateDocument(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_document: (data, sessionKey) => this.deleteDocument(target, data, sessionKey),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private async indexSpaceSource(
    target: Record<string, any>,
    supabase: SupabaseClient,
    input: {
      sourceType: 'space_doc' | 'conversation_document' | 'mission_deliverable'
      sourceId: string
      userId: string
      orgId?: string | null
    },
  ): Promise<void> {
    const indexer = target.spaceAssetIndexService as
      | {
          indexSource: (client: SupabaseClient, payload: typeof input) => Promise<unknown>
        }
      | undefined
    if (!indexer) return
    await indexer.indexSource(supabase, input)
  }

  private async listDocuments(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const spaceId = String(input.space_id ?? '').trim()
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    if (spaceId) {
      const spaceDocumentRows = await this.spaceDocs.listSpaceDocumentRows(supabase, spaceId, input)
      const parentId =
        input.parent_item_id === undefined || input.parent_item_id === null
          ? undefined
          : String(input.parent_item_id)
      const spaceDocuments = this.spaceDocs.serializeSpaceDocumentRows(spaceDocumentRows, parentId)
      const campaignDocuments = campaignId
        ? await this.listConversationDocuments(supabase, campaignId, input)
        : []
      return {
        success: true,
        scope: 'space',
        space_id: spaceId,
        campaign_id: campaignId ?? null,
        documents: spaceDocuments,
        document_index: this.spaceDocs.buildSpaceDocumentIndex(spaceDocumentRows, parentId),
        campaign_documents: campaignDocuments,
      }
    }

    if (!campaignId) {
      return { success: false, error: 'space_id or campaign_id required. Select a space first.' }
    }
    const campaignDocuments = await this.listConversationDocuments(supabase, campaignId, input)
    const campaignSpaceDocumentRows = await this.spaceDocs.listCampaignSpaceDocumentRows(
      supabase,
      campaignId,
      input,
    )
    return {
      success: true,
      scope: 'campaign',
      campaign_id: campaignId,
      documents: this.spaceDocs.serializeSpaceDocumentRows(campaignSpaceDocumentRows),
      document_index: this.spaceDocs.buildSpaceDocumentIndex(campaignSpaceDocumentRows),
      campaign_documents: campaignDocuments,
    }
  }

  private async listConversationDocuments(
    supabase: SupabaseClient,
    campaignId: string,
    input: Record<string, unknown>,
  ) {
    const explicitConversationId =
      typeof input.conversation_id === 'string' && input.conversation_id.trim().length > 0
        ? input.conversation_id.trim()
        : null
    const search = this.spaceDocs.getDocumentSearchTerm(input)
    const { data, error } = await this.runReadWithRetry(
      async () =>
        await this.documentsRepository.listConversationDocuments(supabase, {
          campaignId,
          conversationId: explicitConversationId,
          documentType:
            typeof input.document_type === 'string' && input.document_type.trim().length > 0
              ? input.document_type.trim()
              : null,
          search,
          limit: this.spaceDocs.parseLimit(input.limit, 100, 250),
        }),
    )
    if (error) throw error
    return ((data ?? []) as Array<Record<string, unknown>>).map((doc) =>
      this.spaceDocs.withConversationDocumentRetrievalMetadata(doc),
    )
  }

  private async saveDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (!input.title || !input.content) {
      return { success: false, error: 'title and content required' }
    }

    if ((sessionKey ?? '').includes(':brain_ops:')) {
      return {
        success: false,
        error:
          'save_document is not available for brain operations. Use narrative page or brain write actions.',
      }
    }

    if (target.isMissionSessionKey(sessionKey ?? '')) {
      const userId = target.resolveUserId(sessionKey)
      const { persisted, orgId } = await this.missionDeliverables.saveMissionDocument(
        target,
        input,
        sessionKey ?? '',
        userId,
      )
      await this.indexSpaceSource(target, target.serviceClient, {
        sourceType: 'mission_deliverable',
        sourceId: persisted.deliverable_id,
        userId,
        orgId,
      })
      return persisted
    }

    const rawConversationId =
      (typeof input.conversation_id === 'string' && input.conversation_id.trim().length > 0
        ? input.conversation_id
        : target.parseConversationId(sessionKey ?? '')) ?? null
    if (!rawConversationId) {
      return { success: false, error: 'conversation_id required via valid session key' }
    }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    let conversationId = rawConversationId
    const { data: convExists } = await this.documentsRepository.findConversation(
      supabase,
      rawConversationId,
    )
    if (!convExists) {
      const orgId =
        typeof target.resolveOrgId === 'function'
          ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
          : null
      const anchorMeta = { source: 'channel_tool', anchor_message_id: rawConversationId }
      const { data: existingAnchor } = await this.documentsRepository.findChannelAnchorConversation(
        supabase,
        {
          userId,
          anchorMeta,
        },
      )
      if (existingAnchor?.id) {
        conversationId = String(existingAnchor.id)
      } else {
        const { data: newConv, error: convErr } =
          await this.documentsRepository.createChannelConversation(supabase, {
            user_id: userId,
            title: 'Channel',
            campaign_id: campaignId,
            org_id: orgId,
            metadata: anchorMeta,
          })
        if (convErr) throw convErr
        conversationId = String(newConv.id)
      }
    }

    const { data, error } = await this.documentsRepository.createConversationDocument(supabase, {
      conversation_id: conversationId,
      campaign_id: campaignId,
      title: input.title as string,
      content: input.content,
      document_type: (input.document_type as string) ?? 'upload',
    })
    if (error) throw error

    const spaceId = await resolveDocumentSpaceId(supabase, input, campaignId)
    let spaceItemId: string | null = null
    if (spaceId) {
      const orgId =
        typeof target.resolveOrgId === 'function'
          ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
          : null
      const documentType = (input.document_type as string) ?? 'upload'
      const spaceDoc = await createSpaceDocItem(supabase, {
        spaceId,
        userId,
        orgId,
        title: String(data.title ?? 'Untitled Document'),
        docBody: markdownToHtml(this.spaceDocs.documentContentToSpaceDocBody(data.content)),
        documentType,
        sourceId: String(data.id),
        conversationDocumentId: String(data.id),
        fieldInput: input,
      })
      spaceItemId = spaceDoc.id
      await this.indexSpaceSource(target, supabase, {
        sourceType: 'space_doc',
        sourceId: spaceItemId,
        userId,
        orgId,
      })
      await ensureSpaceView({
        supabase,
        spaceId,
        campaignId,
        viewType: 'docs',
        logger: target.logger,
      })
    }

    const snippet =
      typeof data.content === 'string'
        ? data.content.slice(0, 200)
        : typeof (data.content as Record<string, unknown>)?.text === 'string'
          ? ((data.content as Record<string, unknown>).text as string).slice(0, 200)
          : ''

    return {
      success: true,
      document_id: data.id,
      ...(spaceItemId
        ? {
            space_item_id: spaceItemId,
            note: 'This document also appears in the space Docs view as space_item_id. update_document accepts either id and keeps both copies in sync.',
          }
        : {}),
      retrieve_via: {
        action: 'get_document',
        data: { document_id: data.id },
      },
      ...data,
      ui_blocks: [
        {
          type: 'document_card',
          id: `document-${data.id}`,
          title: data.title ?? 'Untitled Document',
          documentId: data.id,
          spaceId: spaceId ?? undefined,
          spaceItemId: spaceItemId ?? undefined,
          snippet,
        },
      ],
    }
  }

  private async getDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const documentId = String(input.document_id ?? input.item_id ?? input.asset_id ?? '').trim()
    if (!documentId) return { success: false, error: 'document_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const spaceId = String(input.space_id ?? '').trim()
    if (spaceId) {
      const doc = await this.spaceDocs.getSpaceDocumentRow(supabase, spaceId, documentId)
      if (!doc) return { success: false, error: 'Space doc not found' }
      return {
        success: true,
        document: this.spaceDocs.serializeSpaceDocument(doc, true),
      }
    }
    const { data, error } = await this.runReadWithRetry(
      async () => await this.documentsRepository.findConversationDocument(supabase, documentId),
    )
    if (error) throw error
    if (data) {
      const docRecord = data as Record<string, unknown>
      const linked = await this.spaceDocs.findLinkedSpaceDocItems(supabase, documentId)
      if (linked.length === 0)
        return this.spaceDocs.withConversationDocumentRetrievalMetadata(docRecord)
      // The space Docs copy is canonical once it exists: the Docs UI edits it
      // directly, so when it is newer its body must win the read.
      const newest = [...linked].sort(
        (a, b) => Date.parse(String(b.updated_at ?? '')) - Date.parse(String(a.updated_at ?? '')),
      )[0]!
      const convUpdatedAt = Date.parse(String(docRecord.updated_at ?? docRecord.created_at ?? ''))
      const spaceUpdatedAt = Date.parse(String(newest.updated_at ?? ''))
      const spaceIsNewer =
        Number.isFinite(spaceUpdatedAt) &&
        (!Number.isFinite(convUpdatedAt) || spaceUpdatedAt > convUpdatedAt)
      const spaceBody = String(newest.doc_body ?? newest.notes ?? '')
      return {
        ...this.spaceDocs.withConversationDocumentRetrievalMetadata(docRecord),
        space_item_id: newest.id,
        space_id: newest.space_id,
        ...(spaceIsNewer && spaceBody.trim().length > 0
          ? {
              content: spaceBody,
              note: 'content reflects the space Docs copy, which is newer than the conversation copy (edited in the Docs UI). update_document accepts either id and keeps both copies in sync.',
            }
          : {}),
      }
    }
    // Fallback: the id may be a Space Doc item id from the Docs view.
    const spaceItem = await this.spaceDocs.getSpaceDocItemById(supabase, documentId)
    if (spaceItem) {
      const customData = this.spaceDocs.asRecord(spaceItem.custom_data) ?? {}
      const linkedConversationDocumentId = this.spaceDocs.asString(
        customData._conversation_document_id,
      )
      return {
        success: true,
        document: this.spaceDocs.serializeSpaceDocument(spaceItem, true),
        ...(linkedConversationDocumentId
          ? { conversation_document_id: linkedConversationDocumentId }
          : {}),
      }
    }
    return { success: false, error: 'Document not found' }
  }

  private async updateDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const requestedId = String(input.document_id ?? input.item_id ?? input.asset_id ?? '').trim()
    if (!requestedId) return { success: false, error: 'document_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const allowedKeys = ['title', 'content', 'document_type'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowedKeys) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    const hasDocumentUpdates = Object.keys(updates).length > 0
    const hasSpaceFieldUpdates = this.spaceDocs.hasSpaceItemFieldInput(input)
    if (!hasDocumentUpdates && !hasSpaceFieldUpdates)
      return { success: false, error: 'No fields to update' }
    const agentSuppliedContent = updates.content !== undefined

    const { data: directDoc, error: directError } =
      await this.documentsRepository.findConversationDocument(supabase, requestedId)
    if (directError) throw directError

    let conversationDoc = directDoc as Record<string, unknown> | null
    let linkedSpaceItems: SpaceDocRow[] = []

    if (conversationDoc) {
      linkedSpaceItems = await this.spaceDocs.findLinkedSpaceDocItems(supabase, requestedId)
    } else {
      // The agent may have passed the Space Doc item id (Docs view) instead of the conversation document id.
      const spaceItem = await this.spaceDocs.getSpaceDocItemById(supabase, requestedId)
      if (!spaceItem) return { success: false, error: 'Document not found' }
      const customData = this.spaceDocs.asRecord(spaceItem.custom_data) ?? {}
      if ((this.spaceDocs.asString(customData._doc_source) ?? 'space') === 'drive') {
        return {
          success: false,
          error:
            'This doc is synced from Google Drive and cannot be updated here. Edit it in Google Drive instead.',
        }
      }
      linkedSpaceItems = [spaceItem]
      const linkedConversationDocumentId = this.spaceDocs.asString(
        customData._conversation_document_id,
      )
      if (linkedConversationDocumentId) {
        const { data: linkedDoc, error: linkedError } =
          await this.documentsRepository.findConversationDocument(
            supabase,
            linkedConversationDocumentId,
          )
        if (linkedError) throw linkedError
        conversationDoc = (linkedDoc as Record<string, unknown> | null) ?? null
      }
      if (!conversationDoc) {
        // Pure space doc with no conversation counterpart: update the space item directly.
        const updatedItem = await this.spaceDocs.applySpaceDocItemUpdates(
          supabase,
          spaceItem,
          updates,
          input,
        )
        await this.indexSpaceSource(target, supabase, {
          sourceType: 'space_doc',
          sourceId: updatedItem.id,
          userId,
        })
        return { success: true, document: this.spaceDocs.serializeSpaceDocument(updatedItem, true) }
      }
    }

    const conversationDocumentId = String(conversationDoc.id)
    if (!hasDocumentUpdates && linkedSpaceItems.length === 0) {
      return { success: false, error: 'Space field updates require a linked Space document' }
    }
    const nowIso = new Date().toISOString()

    // Freshness guard: the Docs UI edits space_items directly and never syncs back, so the
    // space copy can be newer than the conversation copy. Space edits win unless this update
    // replaces content outright.
    const conversationUpdatedAt = Date.parse(
      String(conversationDoc.updated_at ?? conversationDoc.created_at ?? ''),
    )
    const newestSpaceItem = [...linkedSpaceItems].sort(
      (a, b) => Date.parse(String(b.updated_at ?? '')) - Date.parse(String(a.updated_at ?? '')),
    )[0]
    let spaceCopyWasNewer = false
    if (newestSpaceItem && hasDocumentUpdates) {
      const spaceUpdatedAt = Date.parse(String(newestSpaceItem.updated_at ?? ''))
      if (
        Number.isFinite(spaceUpdatedAt) &&
        (!Number.isFinite(conversationUpdatedAt) || spaceUpdatedAt > conversationUpdatedAt)
      ) {
        spaceCopyWasNewer = true
        if (!agentSuppliedContent) {
          const spaceBody = String(newestSpaceItem.doc_body ?? newestSpaceItem.notes ?? '')
          if (spaceBody.trim().length > 0) updates.content = spaceBody
        }
      }
    }

    const { data, error } = await this.documentsRepository.updateConversationDocument(supabase, {
      documentId: conversationDocumentId,
      updates: { ...updates, updated_at: nowIso },
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Document not found' }

    const syncedSpaceItems: Array<{ space_item_id: string; space_id: string }> = []
    for (const item of linkedSpaceItems) {
      const updatedItem = await this.spaceDocs.applySpaceDocItemUpdates(supabase, item, updates, input)
      syncedSpaceItems.push({ space_item_id: updatedItem.id, space_id: updatedItem.space_id })
      await this.indexSpaceSource(target, supabase, {
        sourceType: 'space_doc',
        sourceId: updatedItem.id,
        userId,
      })
    }

    await this.indexSpaceSource(target, supabase, {
      sourceType: 'conversation_document',
      sourceId: conversationDocumentId,
      userId,
    })

    const note = spaceCopyWasNewer
      ? agentSuppliedContent
        ? 'The space Docs copy had newer edits (likely manual edits in the Docs UI); your content replaced both copies. Re-read the document first if you did not intend to overwrite manual edits.'
        : 'The space Docs copy was newer; its content was synced into the conversation document before applying your update.'
      : null

    return {
      success: true,
      ...this.spaceDocs.withConversationDocumentRetrievalMetadata(data as Record<string, unknown>),
      ...(syncedSpaceItems.length > 0 ? { synced_space_items: syncedSpaceItems } : {}),
      ...(note ? { note } : {}),
    }
  }

  private async deleteDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const documentId = String(input.document_id ?? input.item_id ?? input.asset_id ?? '').trim()
    if (!documentId) return { success: false, error: 'document_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.documentsRepository.findConversationDocument(
      supabase,
      documentId,
      'id, title',
    )
    if (error) throw error
    if (!data) return { success: false, error: 'Document not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        {
          type: 'delete_confirm',
          id: `delete-document-${String(data.id)}-${Date.now()}`,
          delete_action: 'delete_document',
          entity_type: 'document',
          entity_id: String(data.id),
          entity_name: String(data.title ?? 'Untitled Document'),
          status: 'pending',
        },
      ],
    }
  }
}
