import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConversationsRepository } from '../repositories/conversations.repository'
import { MessagesRepository } from '../repositories/messages.repository'

const IMAGE_URL_REGEX =
  /(?:!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|webp|gif)[^\s)]*)\)|(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?))/gi
const VIDEO_URL_REGEX = /(https?:\/\/[^\s]+\.mp4(?:\?[^\s]*)?)/gi
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
const BARE_URL_REGEX = /(https?:\/\/[^\s<>()[\]]+)/gi
const PDF_URL_REGEX =
  /(?:\[([^\]]+)\]\((https?:\/\/[^\s)]+\.pdf[^\s)]*)\)|(https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?))/gi

export type ConversationAssetsScope = 'artifacts' | 'documents' | 'media' | 'links'

type AssetMessageRowRaw = {
  id: string
  conversation_id: string
  role: string
  content: string | null
  content_blocks: Array<{ type?: string; content?: string }> | null
  metadata: Record<string, unknown> | null
  created_at: string
  conversations: Array<{
    id: string
    title: string | null
    agent_id: string | null
    user_id: string
  }>
}

type AssetMessageRow = Omit<AssetMessageRowRaw, 'conversations'> & {
  conversations?: { id: string; title: string | null; agent_id: string | null } | null
}

type MetadataDocAttachment = {
  filename?: string
  type?: 'text' | 'image' | 'video'
  fileUrl?: string
  dataUrl?: string
  mimeType?: string
}

type ExtractedMediaItem = { kind: 'image' | 'video'; url: string; label?: string }
type ExtractedLinkItem = { url: string; title: string }

function normalizeAssetMessages(rows: AssetMessageRowRaw[]): AssetMessageRow[] {
  return rows.map((r) => ({
    ...r,
    conversations: r.conversations?.[0] ?? null,
  }))
}

@Injectable()
export class ConversationAssetsService {
  private static readonly ASSET_SCAN_BATCH = 200
  private static readonly ASSET_SCAN_MAX_MESSAGES = 2000

  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly messagesRepo: MessagesRepository,
  ) {}

  async getAssetsFeed(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    scope: ConversationAssetsScope,
    opts?: { agentId?: string | null; campaignId?: string | null; before?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100)
    if (scope === 'artifacts') {
      const rows = await this.conversationsRepo.findDocumentAssetsByUser(supabase, userId, {
        agentId: opts?.agentId ?? null,
        before: opts?.before,
        limit,
        scope,
        orgId,
      })
      const items = rows.map((row: Record<string, unknown>) => this.mapDocumentAsset(row, scope))
      const nextCursor =
        items.length === limit ? String(items[items.length - 1]?.created_at ?? '') || null : null
      return { items, nextCursor }
    }

    if (scope === 'documents') {
      return this.getDocumentAssetsFeed(supabase, userId, orgId, opts, limit, scope)
    }

    return this.scanMessageAssetsFeed(supabase, userId, orgId, opts, limit, scope)
  }

  private async getDocumentAssetsFeed(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    opts: { agentId?: string | null; before?: string; limit?: number } | undefined,
    limit: number,
    scope: 'documents',
  ) {
    const [nonArtifactRows, fileRows] = await Promise.all([
      this.conversationsRepo.findDocumentAssetsByUser(supabase, userId, {
        agentId: opts?.agentId ?? null,
        before: opts?.before,
        limit,
        scope,
        orgId,
      }),
      this.conversationsRepo.findFileDocumentsByUser(supabase, userId, {
        agentId: opts?.agentId ?? null,
        before: opts?.before,
        limit,
        orgId,
      }),
    ])

    const seenIds = new Set<string>()
    const items: Array<Record<string, unknown>> = []
    for (const row of [...nonArtifactRows, ...fileRows]) {
      const id = String((row as Record<string, unknown>).id)
      if (seenIds.has(id)) continue
      seenIds.add(id)
      items.push(this.mapDocumentAsset(row as Record<string, unknown>, scope))
    }

    if (items.length < limit) {
      const pdfDocs = await this.scanMessagesForPdfAttachments(supabase, userId, {
        agentId: opts?.agentId ?? null,
        before: opts?.before,
        limit: limit - items.length,
        orgId,
      })
      for (const pdf of pdfDocs) {
        if (seenIds.has(String(pdf.id))) continue
        seenIds.add(String(pdf.id))
        items.push(pdf)
      }
    }

    items.sort(
      (a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
    )
    const capped = items.slice(0, limit)
    const nextCursor =
      capped.length === limit ? String(capped[capped.length - 1]?.created_at ?? '') || null : null
    return { items: capped, nextCursor }
  }

  private async scanMessageAssetsFeed(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    opts:
      | { agentId?: string | null; campaignId?: string | null; before?: string; limit?: number }
      | undefined,
    limit: number,
    scope: ConversationAssetsScope,
  ) {
    const dedupe = new Set<string>()
    const items: Array<Record<string, unknown>> = []
    let before = opts?.before
    let scanned = 0
    let reachedEnd = false

    while (items.length < limit && scanned < ConversationAssetsService.ASSET_SCAN_MAX_MESSAGES) {
      const batch = await this.messagesRepo.findMessagesForAssets(supabase, userId, {
        agentId: opts?.agentId ?? null,
        campaignId: opts?.campaignId ?? null,
        before,
        limit: ConversationAssetsService.ASSET_SCAN_BATCH,
        orgId,
      })
      if (batch.length === 0) {
        reachedEnd = true
        break
      }

      scanned += batch.length
      const parsedBatch = normalizeAssetMessages(batch as AssetMessageRowRaw[])
      for (const msg of parsedBatch) {
        this.addMessageAssetItems(msg, scope, dedupe, items, limit)
        if (items.length >= limit) break
      }

      const last = parsedBatch[parsedBatch.length - 1]
      before = last?.created_at
      if (batch.length < ConversationAssetsService.ASSET_SCAN_BATCH) {
        reachedEnd = true
        break
      }
    }

    const nextCursor = !reachedEnd && before ? before : null
    return { items, nextCursor }
  }

  private addMessageAssetItems(
    msg: AssetMessageRow,
    scope: ConversationAssetsScope,
    dedupe: Set<string>,
    items: Array<Record<string, unknown>>,
    limit: number,
  ): void {
    const text = this.messagePlainText(msg)
    const metaDocs = this.extractMetadataDocuments(msg)
    if (scope === 'links') {
      if (!text) return
      const snippet = text
        .replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
      for (const link of this.extractLinksFromText(text)) {
        const key = `${msg.id}:${link.url}`
        if (dedupe.has(key)) continue
        dedupe.add(key)
        items.push(this.mapLinkItem(msg, scope, key, link, snippet))
        if (items.length >= limit) break
      }
      return
    }

    if (text) {
      for (const media of this.extractMediaFromText(text)) {
        const key = `${msg.id}:${media.url}`
        if (dedupe.has(key)) continue
        dedupe.add(key)
        items.push(this.mapMediaItem(msg, scope, key, media))
        if (items.length >= limit) break
      }
    }
    for (const doc of metaDocs) {
      const key = `${msg.id}:meta:${doc.url}`
      if (dedupe.has(key)) continue
      dedupe.add(key)
      items.push(this.mapMediaItem(msg, scope, key, doc))
      if (items.length >= limit) break
    }
  }

  private async scanMessagesForPdfAttachments(
    supabase: SupabaseClient,
    userId: string,
    opts: { agentId?: string | null; before?: string; limit: number; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    const results: Array<Record<string, unknown>> = []
    const dedupe = new Set<string>()
    let before = opts.before
    let scanned = 0

    while (results.length < opts.limit && scanned < ConversationAssetsService.ASSET_SCAN_MAX_MESSAGES) {
      const batch = await this.messagesRepo.findMessagesForAssets(supabase, userId, {
        agentId: opts.agentId,
        before,
        limit: ConversationAssetsService.ASSET_SCAN_BATCH,
        orgId: opts.orgId,
      })
      if (batch.length === 0) break
      scanned += batch.length

      const normalized = normalizeAssetMessages(batch as AssetMessageRowRaw[])
      for (const msg of normalized) {
        this.addPdfAttachmentItems(msg, dedupe, results, opts.limit)
        if (results.length >= opts.limit) break
      }

      const last = normalized[normalized.length - 1]
      before = last?.created_at
      if (batch.length < ConversationAssetsService.ASSET_SCAN_BATCH) break
    }

    return results
  }

  private addPdfAttachmentItems(
    msg: AssetMessageRow,
    dedupe: Set<string>,
    results: Array<Record<string, unknown>>,
    limit: number,
  ): void {
    const text = this.messagePlainText(msg)
    if (text) {
      for (const pdf of this.extractPdfUrlsFromText(text)) {
        const key = `${msg.id}:pdf:${pdf.url}`
        if (dedupe.has(key)) continue
        dedupe.add(key)
        results.push(this.mapPdfDocument(msg, key, pdf.url, pdf.label, 'pdf'))
        if (results.length >= limit) break
      }
    }
    const docs = msg.metadata?.documents as MetadataDocAttachment[] | undefined
    if (!Array.isArray(docs)) return
    for (const doc of docs) {
      const url = doc.fileUrl?.trim() || doc.dataUrl?.trim()
      if (!url) continue
      const mime = (doc.mimeType ?? '').toLowerCase()
      const isPdf = mime === 'application/pdf' || (doc.filename ?? '').toLowerCase().endsWith('.pdf')
      const isText = doc.type === 'text' && !mime.startsWith('image/') && !mime.startsWith('video/')
      if (!isPdf && !isText) continue
      const key = `${msg.id}:meta:${url}`
      if (dedupe.has(key)) continue
      dedupe.add(key)
      results.push(this.mapPdfDocument(msg, key, url, doc.filename ?? 'Document', isPdf ? 'pdf' : 'upload'))
      if (results.length >= limit) break
    }
  }

  private mapDocumentAsset(row: Record<string, unknown>, scope: ConversationAssetsScope) {
    const c =
      (row.conversations as { id?: string; title?: string | null; agent_id?: string | null }) ?? {}
    return {
      id: String(row.id),
      scope,
      created_at: String(row.created_at),
      conversation_id: String(row.conversation_id),
      conversation_title: c.title ?? null,
      agent_id: c.agent_id ?? null,
      document: {
        id: String(row.id),
        conversation_id: String(row.conversation_id),
        campaign_id: (row.campaign_id as string | null) ?? null,
        document_type: String(row.document_type),
        title: (row.title as string | null) ?? null,
        content: (row.content as Record<string, unknown>) ?? {},
        created_at: String(row.created_at),
        updated_at: String(row.updated_at ?? row.created_at),
      },
    }
  }

  private mapPdfDocument(
    msg: AssetMessageRow,
    key: string,
    url: string,
    title: string,
    documentType: 'pdf' | 'upload',
  ) {
    return {
      id: key,
      scope: 'documents',
      created_at: msg.created_at,
      conversation_id: msg.conversation_id,
      conversation_title: msg.conversations?.title ?? null,
      agent_id: msg.conversations?.agent_id ?? null,
      document: {
        id: key,
        conversation_id: msg.conversation_id,
        campaign_id: null,
        document_type: documentType,
        title,
        content: { file_url: url, type: documentType === 'pdf' ? 'pdf' : 'text' },
        created_at: msg.created_at,
        updated_at: msg.created_at,
      },
    }
  }

  private mapLinkItem(
    msg: AssetMessageRow,
    scope: ConversationAssetsScope,
    key: string,
    link: ExtractedLinkItem,
    snippet: string,
  ) {
    return {
      id: key,
      scope,
      created_at: msg.created_at,
      conversation_id: msg.conversation_id,
      conversation_title: msg.conversations?.title ?? null,
      agent_id: msg.conversations?.agent_id ?? null,
      message_id: msg.id,
      message_snippet: snippet,
      url: link.url,
      title: link.title,
    }
  }

  private mapMediaItem(
    msg: AssetMessageRow,
    scope: ConversationAssetsScope,
    key: string,
    media: ExtractedMediaItem,
  ) {
    return {
      id: key,
      scope,
      created_at: msg.created_at,
      conversation_id: msg.conversation_id,
      conversation_title: msg.conversations?.title ?? null,
      agent_id: msg.conversations?.agent_id ?? null,
      message_id: msg.id,
      media_kind: media.kind,
      url: media.url,
      title: media.label ?? media.kind,
    }
  }

  private extractPdfUrlsFromText(text: string): Array<{ url: string; label: string }> {
    const results: Array<{ url: string; label: string }> = []
    const seen = new Set<string>()
    const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()
    PDF_URL_REGEX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = PDF_URL_REGEX.exec(cleaned)) !== null) {
      const linkText = m[1] ?? null
      const mdUrl = m[2] ?? null
      const bareUrl = m[3] ?? null
      const url = mdUrl ?? bareUrl ?? ''
      if (!url || seen.has(url)) continue
      seen.add(url)
      const label = linkText ?? (url.split('/').pop()?.split('?')[0] || 'Document.pdf')
      results.push({ url, label })
    }
    return results
  }

  private extractMetadataDocuments(
    message: AssetMessageRow,
  ): Array<{ kind: 'image' | 'video'; url: string; label: string }> {
    const docs = message.metadata?.documents as MetadataDocAttachment[] | undefined
    if (!Array.isArray(docs) || docs.length === 0) return []
    const results: Array<{ kind: 'image' | 'video'; url: string; label: string }> = []
    for (const doc of docs) {
      const url = doc.fileUrl?.trim() || doc.dataUrl?.trim()
      if (!url) continue
      const mime = (doc.mimeType ?? '').toLowerCase()
      const docType = doc.type ?? ''
      if (docType === 'image' || mime.startsWith('image/')) {
        results.push({ kind: 'image', url, label: doc.filename ?? 'Image' })
      } else if (docType === 'video' || mime.startsWith('video/')) {
        results.push({ kind: 'video', url, label: doc.filename ?? 'Video' })
      }
    }
    return results
  }

  private messagePlainText(message: AssetMessageRow): string {
    if (message.content && message.content.trim()) return message.content
    const blocks = message.content_blocks
    if (!blocks?.length) return ''
    return blocks
      .filter((b) => b.type === 'text' && typeof b.content === 'string')
      .map((b) => b.content as string)
      .join('\n')
  }

  private extractMediaFromText(text: string): ExtractedMediaItem[] {
    const map = new Map<string, ExtractedMediaItem>()
    const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()
    IMAGE_URL_REGEX.lastIndex = 0
    let imgMatch: RegExpExecArray | null
    while ((imgMatch = IMAGE_URL_REGEX.exec(cleaned)) !== null) {
      const alt = imgMatch[1] ?? 'Image'
      const url = imgMatch[2] ?? imgMatch[3] ?? ''
      if (url && !map.has(url)) map.set(url, { kind: 'image', url, label: alt })
    }
    VIDEO_URL_REGEX.lastIndex = 0
    let vidMatch: RegExpExecArray | null
    while ((vidMatch = VIDEO_URL_REGEX.exec(cleaned)) !== null) {
      const url = vidMatch[1] ?? ''
      if (url && !map.has(url)) map.set(url, { kind: 'video', url, label: 'Video' })
    }
    return [...map.values()]
  }

  private extractLinksFromText(text: string): ExtractedLinkItem[] {
    const map = new Map<string, ExtractedLinkItem>()
    const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()
    MARKDOWN_LINK_REGEX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = MARKDOWN_LINK_REGEX.exec(cleaned)) !== null) {
      const url = m[2] ?? ''
      const title = (m[1] ?? '').trim() || url
      if (url && !this.isImageOrVideoUrl(url)) map.set(url, { url, title })
    }
    BARE_URL_REGEX.lastIndex = 0
    while ((m = BARE_URL_REGEX.exec(cleaned)) !== null) {
      const url = m[1] ?? ''
      if (!url || this.isImageOrVideoUrl(url)) continue
      if (!map.has(url)) map.set(url, { url, title: this.truncateHost(url) })
    }
    return [...map.values()]
  }

  private isImageOrVideoUrl(url: string): boolean {
    const lower = url.toLowerCase()
    return /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(lower) || /\.mp4(\?|$)/i.test(lower)
  }

  private truncateHost(url: string): string {
    try {
      const u = new URL(url)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return url.slice(0, 48)
    }
  }
}
