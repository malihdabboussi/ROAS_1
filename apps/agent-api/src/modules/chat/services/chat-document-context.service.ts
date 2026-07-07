import { Injectable, type Logger } from '@nestjs/common'
import {
  assessDocumentTextQuality,
  buildDocumentIntelligenceMetadata,
  SupabaseServiceClient,
  type DocumentIntelligenceMetadata,
} from '@vibey/api-shared'
import { ChatAttachmentContextRepository } from '../repositories/chat-attachment-context.repository'
import { buildUploadedDocumentContext } from '../utils/uploaded-document-context'

export interface ChatDocumentAttachment {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

@Injectable()
export class ChatDocumentContextService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly chatAttachmentContextRepository: ChatAttachmentContextRepository,
  ) {}

  async saveUploadedDocuments(
    conversationId: string,
    campaignId: string | undefined,
    documents: ChatDocumentAttachment[],
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<void> {
    const serviceClient = this.svc.client

    const rows = documents
      .filter(
        (doc) =>
          (doc.type === 'text' && (doc.text || doc.fileUrl || doc.mediaAssetId)) ||
          (doc.type === 'image' && doc.fileUrl),
      )
      .map((doc) => ({
        conversation_id: conversationId,
        campaign_id: campaignId ?? null,
        title: doc.filename,
        content:
          doc.type === 'image'
            ? {
                source: 'user_upload' as const,
                media_type: 'image' as const,
                file_url: doc.fileUrl,
              }
            : {
                text: doc.text,
                source: 'user_upload' as const,
                ...(doc.fileUrl ? { file_url: doc.fileUrl } : {}),
                ...(doc.mediaAssetId ? { asset_id: doc.mediaAssetId } : {}),
                ...(doc.preview ? { preview: doc.preview } : {}),
              },
        metadata: doc.documentIntelligence
          ? { document_intelligence: doc.documentIntelligence }
          : {},
        document_type: doc.type === 'image' ? 'image_upload' : 'upload',
      }))

    if (rows.length === 0) return
    const error = await this.chatAttachmentContextRepository.insertConversationDocuments(
      serviceClient,
      rows,
    )
    if (error) {
      logger.warn(`Failed to persist uploaded documents: ${error.message}`)
    } else {
      logger.log(`Saved ${rows.length} uploaded document(s) to conversation_documents`)
    }
  }

  async cacheUploadedDocumentText(
    mediaAssetId: string,
    text: string,
    pageCount?: number,
    documentIntelligence?: DocumentIntelligenceMetadata,
  ): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed && !documentIntelligence) return

    const patch: Record<string, unknown> = {
      indexed_at: new Date().toISOString(),
      index_error: null,
    }
    if (trimmed) {
      patch.text_layer = trimmed
    }
    if (pageCount && Number.isFinite(pageCount)) {
      patch.page_count = pageCount
    }
    if (documentIntelligence) {
      patch.document_intelligence = documentIntelligence
    } else if (trimmed) {
      const assessment = assessDocumentTextQuality({ text: trimmed, pageCount })
      patch.document_intelligence = buildDocumentIntelligenceMetadata({
        status: assessment.quality === 'usable' ? 'ready' : 'failed',
        strategy: assessment.quality === 'usable' ? 'native_text' : 'metadata_only',
        assessment,
      })
    }

    const error = await this.chatAttachmentContextRepository.updateMediaAssetDocumentCache(
      this.svc.client,
      {
        mediaAssetId,
        patch,
      },
    )
    if (error) {
      throw new Error(error.message)
    }
  }

  async loadUploadedDocumentCache(
    mediaAssetId: string,
    userId: string,
    orgId: string | null,
  ): Promise<{
    textLayer: string
    documentIntelligence: DocumentIntelligenceMetadata | null
    pageCount: number | null
    fileUrl: string | null
    sizeBytes: number | null
    mimeType: string | null
  } | null> {
    const { data, error } = await this.chatAttachmentContextRepository.findMediaAssetDocumentCache(
      this.svc.client,
      { mediaAssetId, userId, orgId },
    )
    if (error || !data) return null
    return {
      textLayer: typeof data.text_layer === 'string' ? data.text_layer.trim() : '',
      documentIntelligence: this.normalizeDocumentIntelligence(data.document_intelligence),
      pageCount:
        data.page_count == null || !Number.isFinite(Number(data.page_count))
          ? null
          : Number(data.page_count),
      fileUrl:
        typeof data.public_url === 'string' && data.public_url.trim() ? data.public_url : null,
      sizeBytes:
        data.file_size == null || !Number.isFinite(Number(data.file_size))
          ? null
          : Number(data.file_size),
      mimeType: typeof data.mime_type === 'string' ? data.mime_type : null,
    }
  }

  isCachedDocumentTextUsable(
    text: string,
    intelligence: DocumentIntelligenceMetadata | null,
    doc: ChatDocumentAttachment,
  ): boolean {
    const assessment = assessDocumentTextQuality({
      text,
      pageCount: doc.pageCount,
      mimeType: doc.mimeType,
      filename: doc.filename,
    })
    if (assessment.quality !== 'usable') return false
    if (!intelligence) return true
    return intelligence.status === 'ready' && intelligence.text_quality === 'usable'
  }

  buildDocumentContext(documents: ChatDocumentAttachment[]): string {
    return buildUploadedDocumentContext(documents)
  }

  buildImageContext(documents: ChatDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**CURRENT MESSAGE IMAGE FILES (already attached as native image inputs; inspect them directly. Use analyze_image only later with image_url or asset_id if you need to re-read stored images.)**\n',
    ]
    for (const doc of documents) {
      parts.push(
        `\n- **${doc.filename}**\n` +
          `  - status: attached to this model turn as an image input\n` +
          (doc.fileUrl ? `  - image_url: ${doc.fileUrl}\n` : '') +
          (doc.mediaAssetId ? `  - asset_id: ${doc.mediaAssetId}\n` : '') +
          `  - mime: ${doc.mimeType ?? 'image/*'}\n`,
      )
    }
    return parts.join('')
  }

  buildVideoContext(documents: ChatDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**USER-UPLOADED VIDEO FILES (use analyze_video with media_url to extract frames, transcribe, or both)**\n',
    ]
    for (const doc of documents) {
      parts.push(
        `\n- **${doc.filename}**\n` +
          `  - media_url: ${doc.fileUrl}\n` +
          `  - mime: ${doc.mimeType ?? 'video/*'}\n` +
          `  - Suggested call: analyze_video(media_url="${doc.fileUrl}")\n`,
      )
    }
    return parts.join('')
  }

  buildAudioContext(documents: ChatDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**USER-UPLOADED AUDIO FILES (use transcribe_audio with media_url to transcribe voice notes or audio files; keep the original audio URL. When the spoken language is explicit or reliably known, include language with the provider language code so transcription does not depend on auto-detection.)**\n',
    ]
    for (const doc of documents) {
      parts.push(
        `\n- **${doc.filename}**\n` +
          `  - media_url: ${doc.fileUrl}\n` +
          `  - mime: ${doc.mimeType ?? 'audio/*'}\n` +
          `  - Suggested call: transcribe_audio(media_url="${doc.fileUrl}")\n` +
          `  - If the spoken language is known, call: transcribe_audio(media_url="${doc.fileUrl}", language="<provider-language-code>")\n`,
      )
    }
    return parts.join('')
  }

  async loadPreviousImageUrls(
    conversationId: string,
  ): Promise<Array<{ filename: string; url: string }>> {
    const { data, error } = await this.chatAttachmentContextRepository.listPreviousImageUploads(
      this.svc.client,
      conversationId,
    )

    if (error || !data) return []

    return data
      .map((row) => {
        const content = row.content as Record<string, unknown> | null
        const url = typeof content?.file_url === 'string' ? content.file_url : null
        if (!url) return null
        return { filename: String(row.title ?? 'image'), url }
      })
      .filter((item): item is { filename: string; url: string } => item !== null)
  }

  buildImageUrlContext(images: Array<{ filename: string; url: string }>): string {
    if (images.length === 0) return ''
    const lines = [
      '\n\n---\n**USER-UPLOADED IMAGES (available for use in funnels, ads, social posts, etc.; use analyze_image with image_url to inspect or rank them)**\n',
    ]
    for (const img of images) {
      lines.push(
        `- ${img.filename}: ${img.url}\n  - Suggested call: analyze_image(image_url="${img.url}")`,
      )
    }
    return lines.join('\n')
  }

  private normalizeDocumentIntelligence(value: unknown): DocumentIntelligenceMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Partial<DocumentIntelligenceMetadata>
    if (record.status !== 'processing' && record.status !== 'ready' && record.status !== 'failed') {
      return null
    }
    return record as DocumentIntelligenceMetadata
  }
}
