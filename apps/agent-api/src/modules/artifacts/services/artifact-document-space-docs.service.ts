import { readFile } from 'node:fs/promises'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ArtifactDocumentsRepository,
  type ArtifactSpaceDocRow,
} from '../repositories/artifact-documents.repository'
import { markdownToHtml } from '../utils/markdown-to-html.util'
import { DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS } from './artifact-space-item-field-contract'
import {
  buildDocumentSpaceItemFieldPayload,
  hasDocumentSpaceItemFieldInput,
  recordFrom,
} from './artifact-space-item-field-payload'

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

export type SpaceDocRow = ArtifactSpaceDocRow

type SpaceDocumentIndexNode = ReturnType<
  ArtifactDocumentSpaceDocsService['serializeSpaceDocument']
> & {
  children: SpaceDocumentIndexNode[]
}

export class ArtifactDocumentSpaceDocsService {
  constructor(private readonly documentsRepository: ArtifactDocumentsRepository) {}

  async readSpaceDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const documentId = String(input.document_id ?? input.item_id ?? '').trim()
    const spaceId = String(input.space_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!documentId) return { success: false, error: 'document_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const doc = await this.getSpaceDocumentRow(supabase, spaceId, documentId)
    if (!doc) return { success: false, error: 'Space doc not found' }

    const customData = this.asRecord(doc.custom_data) ?? {}
    const docKind = this.asString(customData._doc_kind) ?? 'file'
    const docSource = this.asString(customData._doc_source) ?? 'space'
    if (docKind === 'folder') {
      const rows = await this.listSpaceDocumentRows(supabase, spaceId, {
        limit: input.limit ?? 250,
      })
      const children = this.serializeSpaceDocumentRows(rows, doc.id)
      return {
        success: true,
        document: this.serializeSpaceDocument(doc, true),
        kind: 'folder',
        children,
        document_index: this.buildSpaceDocumentIndex(rows, doc.id),
      }
    }

    if (docSource === 'drive') {
      const driveFileId = this.asString(customData._drive_file_id)
      if (!driveFileId) return { success: false, error: 'Drive file id missing' }
      const content = await this.readDriveFileContent(
        target,
        supabase,
        userId,
        driveFileId,
        customData,
        sessionKey,
      )
      return {
        success: true,
        document: this.serializeSpaceDocument(doc, true),
        ...content,
      }
    }

    const content = String(doc.doc_body ?? doc.notes ?? '').trim()
    return {
      success: true,
      document: this.serializeSpaceDocument(doc, true),
      kind: 'html',
      mime_type: 'text/html',
      content,
      plain_text: this.htmlToPlainText(content),
    }
  }

  async listCampaignSpaceDocumentRows(
    supabase: SupabaseClient,
    campaignId: string,
    input: Record<string, unknown>,
  ) {
    const { data: spaces, error: spacesError } = await this.documentsRepository.listCampaignSpaces(
      supabase,
      campaignId,
    )
    if (spacesError) throw spacesError
    const spaceIds = (spaces ?? [])
      .map((space: Record<string, unknown>) => (typeof space.id === 'string' ? space.id : null))
      .filter((id): id is string => Boolean(id))
    if (spaceIds.length === 0) return []
    return this.listSpaceDocumentRows(supabase, spaceIds, input)
  }

  async listSpaceDocuments(
    supabase: SupabaseClient,
    spaceId: string | string[],
    input: Record<string, unknown>,
  ) {
    const rows = await this.listSpaceDocumentRows(supabase, spaceId, input)
    return this.serializeSpaceDocumentRows(rows, input.parent_item_id)
  }

  async listSpaceDocumentRows(
    supabase: SupabaseClient,
    spaceId: string | string[],
    input: Record<string, unknown>,
  ): Promise<SpaceDocRow[]> {
    const limit = this.parseLimit(input.limit, 100, 250)
    const search = this.getDocumentSearchTerm(input)
    const { data, error } = await this.documentsRepository.listSpaceDocumentRows(supabase, {
      spaceId,
      parentItemId: input.parent_item_id,
      docSource:
        typeof input.doc_source === 'string' && input.doc_source.trim()
          ? input.doc_source.trim()
          : null,
      search,
      limit,
    })
    if (error) throw error
    return (data ?? []) as SpaceDocRow[]
  }

  async getSpaceDocumentRow(
    supabase: SupabaseClient,
    spaceId: string,
    documentId: string,
  ): Promise<SpaceDocRow | null> {
    const { data, error } = await this.documentsRepository.findSpaceDocumentRow(supabase, {
      spaceId,
      documentId,
    })
    if (error) throw error
    return (data as SpaceDocRow | null) ?? null
  }

  serializeSpaceDocument(doc: SpaceDocRow, includeBody: boolean) {
    const customData = this.asRecord(doc.custom_data) ?? {}
    const docSource = this.asString(customData._doc_source) ?? 'space'
    const docKind = this.asString(customData._doc_kind) ?? 'file'
    const driveMimeType = this.asString(customData._drive_mime_type)
    const driveWebViewLink = this.asString(customData._drive_web_view_link)
    const content = includeBody ? String(doc.doc_body ?? doc.notes ?? '') : ''
    return {
      id: doc.id,
      document_id: doc.id,
      source: 'space_doc',
      space_id: doc.space_id,
      title: doc.title ?? 'Untitled',
      parent_item_id: doc.parent_item_id ?? null,
      doc_source: docSource,
      doc_kind: docKind,
      is_folder: docKind === 'folder',
      is_file: docKind !== 'folder',
      mime_type: driveMimeType,
      web_view_link: driveWebViewLink,
      drive_file_id: this.asString(customData._drive_file_id),
      updated_at: doc.updated_at ?? null,
      created_at: doc.created_at ?? null,
      retrieve_via:
        docKind === 'folder'
          ? `list_documents(space_id="${doc.space_id}", parent_item_id="${doc.id}")`
          : `read_space_document(space_id="${doc.space_id}", document_id="${doc.id}")`,
      ...(includeBody && content ? { content, plain_text: this.htmlToPlainText(content) } : {}),
    }
  }

  serializeSpaceDocumentRows(rows: SpaceDocRow[], parentId?: unknown) {
    const normalizedParent =
      parentId === undefined
        ? undefined
        : parentId === null || parentId === 'null'
          ? null
          : String(parentId)
    return rows
      .filter((row) => {
        if (normalizedParent === undefined) return true
        return (row.parent_item_id ?? null) === normalizedParent
      })
      .map((doc) => this.serializeSpaceDocument(doc, false))
  }

  buildSpaceDocumentIndex(rows: SpaceDocRow[], parentId?: string | null): SpaceDocumentIndexNode[] {
    const byParent = new Map<string | null, SpaceDocRow[]>()
    for (const row of rows) {
      const key = row.parent_item_id ?? null
      byParent.set(key, [...(byParent.get(key) ?? []), row])
    }

    const walk = (currentParentId: string | null, seen: Set<string>): SpaceDocumentIndexNode[] => {
      return (byParent.get(currentParentId) ?? []).map((row) => {
        const serialized = this.serializeSpaceDocument(row, false)
        if (seen.has(row.id)) return { ...serialized, children: [] }
        const nextSeen = new Set(seen)
        nextSeen.add(row.id)
        return {
          ...serialized,
          children: walk(row.id, nextSeen),
        }
      })
    }

    return walk(parentId ?? null, new Set())
  }

  async findLinkedSpaceDocItems(
    supabase: SupabaseClient,
    conversationDocumentId: string,
  ): Promise<SpaceDocRow[]> {
    const { data, error } = await this.documentsRepository.findLinkedSpaceDocItems(
      supabase,
      conversationDocumentId,
    )
    if (error) throw error
    return (data ?? []) as SpaceDocRow[]
  }

  async getSpaceDocItemById(
    supabase: SupabaseClient,
    documentId: string,
  ): Promise<SpaceDocRow | null> {
    const { data, error } = await this.documentsRepository.findSpaceDocItemById(
      supabase,
      documentId,
    )
    if (error) throw error
    return (data as SpaceDocRow | null) ?? null
  }

  async applySpaceDocItemUpdates(
    supabase: SupabaseClient,
    item: SpaceDocRow,
    updates: Record<string, unknown>,
    fieldInput: Record<string, unknown> = updates,
  ): Promise<SpaceDocRow> {
    const itemUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) itemUpdates.title = updates.title
    if (updates.content !== undefined) {
      itemUpdates.doc_body = markdownToHtml(this.documentContentToSpaceDocBody(updates.content))
    }
    const fieldPayload = await buildDocumentSpaceItemFieldPayload(supabase, item.space_id, fieldInput)
    for (const key of DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS) {
      if (fieldPayload.payload[key] !== undefined) itemUpdates[key] = fieldPayload.payload[key]
    }
    const customData = this.asRecord(item.custom_data) ?? {}
    const fieldCustomData = recordFrom(fieldPayload.payload.custom_data)
    let nextCustomData =
      Object.keys(fieldCustomData).length > 0 ? { ...customData, ...fieldCustomData } : null
    if (updates.document_type !== undefined) {
      nextCustomData = { ...(nextCustomData ?? customData), _doc_type: updates.document_type }
    }
    if (nextCustomData) itemUpdates.custom_data = nextCustomData
    const { data, error } = await this.documentsRepository.updateSpaceDocItem(supabase, {
      itemId: item.id,
      updates: itemUpdates,
    })
    if (error) throw error
    return data as SpaceDocRow
  }

  hasSpaceItemFieldInput(input: Record<string, unknown>): boolean {
    return hasDocumentSpaceItemFieldInput(input)
  }

  documentContentToSpaceDocBody(value: unknown): string | null {
    if (typeof value === 'string') return value
    if (value == null) return null
    if (typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>
      for (const key of ['html', 'text', 'markdown', 'source_content', 'content', 'body']) {
        const raw = record[key]
        if (typeof raw === 'string' && raw.trim().length > 0) return raw
      }
    }
    return this.stringifyDeliverableContent(value)
  }

  htmlToPlainText(value: string): string {
    return value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  }

  getDocumentSearchTerm(input: Record<string, unknown>): string | null {
    const search = input.search
    return typeof search === 'string' && search.trim().length > 0 ? search.trim() : null
  }

  withConversationDocumentRetrievalMetadata(doc: Record<string, unknown>): Record<string, unknown> {
    const documentId = typeof doc.id === 'string' ? doc.id : null
    if (!documentId) return doc
    return {
      ...doc,
      document_id: documentId,
      retrieve_via: {
        action: 'get_document',
        data: { document_id: documentId },
      },
    }
  }

  private async readDriveFileContent(
    target: Record<string, any>,
    supabase: SupabaseClient,
    userId: string,
    driveFileId: string,
    customData: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const mimeType = this.asString(customData._drive_mime_type) ?? 'application/octet-stream'
    if (mimeType === DRIVE_FOLDER_MIME_TYPE) {
      return { kind: 'folder', mime_type: mimeType, content: '' }
    }
    const exportMimeType = this.resolveDriveExportMime(mimeType)
    if (!exportMimeType) {
      return {
        kind: 'link',
        mime_type: mimeType,
        content: '',
        web_view_link: this.asString(customData._drive_web_view_link),
        note: 'This Drive file type is available as a link, but readable text export is not supported yet.',
      }
    }
    const connectedAccountId = await this.getGoogleDriveConnectedAccountId(
      supabase,
      userId,
      typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null,
    )
    if (!connectedAccountId) return { success: false, error: 'Google Drive is not connected' }
    const composio = target.composioService as
      | {
          executeTool: (
            toolSlug: string,
            userId: string,
            args: Record<string, unknown>,
            connectedAccountId?: string,
          ) => Promise<unknown>
        }
      | undefined
    if (!composio) return { success: false, error: 'Google Drive reader is not available' }

    const raw = await composio.executeTool(
      'GOOGLEDRIVE_DOWNLOAD_FILE',
      userId,
      { file_id: driveFileId, mime_type: exportMimeType },
      connectedAccountId,
    )
    const buffer = await this.resolveComposioDownloadBuffer(raw)
    if (!buffer) return { success: false, error: 'Failed to download Google Drive file' }
    if (exportMimeType === 'application/pdf') {
      return {
        kind: 'pdf',
        mime_type: exportMimeType,
        content: '',
        web_view_link: this.asString(customData._drive_web_view_link),
        note: 'This Drive file exports as PDF. Open the source link or attach the PDF asset for page-aware reading.',
      }
    }
    const content = buffer.toString('utf8')
    return {
      kind: exportMimeType === 'text/csv' ? 'csv' : 'html',
      mime_type: exportMimeType,
      content,
      plain_text: this.htmlToPlainText(content),
      web_view_link: this.asString(customData._drive_web_view_link),
    }
  }

  private async getGoogleDriveConnectedAccountId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const { data, error } = await this.documentsRepository.findGoogleDriveIntegrationMetadata(
      supabase,
      { userId, orgId },
    )
    if (error || !data) return null
    const metadata = this.asRecord(data.metadata)
    return this.asString(metadata?.composio_connected_account_id)
  }

  private async resolveComposioDownloadBuffer(value: unknown): Promise<Buffer | null> {
    const payload = this.unwrapComposioPayload(value)
    const payloadRecord = this.asRecord(payload)
    const payloadDataRecord = this.asRecord(payloadRecord?.data)
    const filePath =
      this.asString(payloadRecord?.file_path) ??
      this.asString(payloadDataRecord?.file_path) ??
      this.asString(payloadRecord?.path) ??
      this.asString(payloadDataRecord?.path)
    if (filePath) return readFile(filePath)

    const rawDownloaded =
      payloadRecord?.downloaded_file_content ?? payloadDataRecord?.downloaded_file_content
    const directContent =
      this.asString(rawDownloaded) ??
      (this.asRecord(rawDownloaded)
        ? (this.asString(this.asRecord(rawDownloaded)?.content) ??
          this.asString(this.asRecord(rawDownloaded)?.data) ??
          this.asString(this.asRecord(rawDownloaded)?.base64))
        : null)
    if (directContent) return Buffer.from(directContent, 'base64')

    const obj = this.asRecord(rawDownloaded)
    const downloadUrl =
      this.asString(obj?.s3url) ??
      this.asString(obj?.uri) ??
      this.asString(payloadRecord?.download_url) ??
      this.asString(payloadDataRecord?.download_url)
    if (!downloadUrl) return null
    const res = await fetch(downloadUrl)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  }

  private unwrapComposioPayload(value: unknown): unknown {
    let current: unknown = value
    for (let i = 0; i < 4; i += 1) {
      const record = this.asRecord(current)
      if (!record) break
      if (typeof record.error === 'string' && record.error.length > 0) {
        throw new Error(record.error)
      }
      if (record.successful === false) {
        throw new Error(
          typeof record.error === 'string' ? record.error : 'Composio tool execution failed',
        )
      }
      if ('data' in record && record.data !== undefined && record.data !== null) {
        current = record.data
        continue
      }
      break
    }
    return current
  }

  private resolveDriveExportMime(mimeType: string): string | null {
    if (mimeType === 'application/vnd.google-apps.document') return 'text/html'
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'text/csv'
    if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/json')
      return mimeType
    if (mimeType.startsWith('text/')) return mimeType
    if (mimeType === 'application/vnd.google-apps.presentation') return 'application/pdf'
    return null
  }

  parseLimit(value: unknown, fallback: number, max: number): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (!Number.isFinite(n) || n <= 0) return fallback
    return Math.min(Math.floor(n), max)
  }

  private stringifyDeliverableContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
}
