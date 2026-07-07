import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  assessDocumentTextQuality,
  buildDocumentIntelligenceMetadata,
  ErrorReporter,
  type DocumentIntelligenceMetadata,
  type DocumentTextQualityAssessment,
} from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { MediaRepository } from '../repositories/media.repository'
import { MediaReaderService } from './media-reader.service'

const CHEAP_TEXT_EXTRACT_MAX_PAGES = 5
const CHEAP_TEXT_EXTRACT_MAX_BYTES = 2 * 1024 * 1024
const MAX_TEXT_LAYER_CHARS = 200_000
const MAX_VECTOR_INDEX_PAGES = 200
const MAX_VECTOR_CHUNKS = 200
const MAX_VECTOR_CHUNK_CHARS = 1200
const MAX_VECTOR_EMBED_INPUT_CHARS = 4000
const EMBEDDING_DIMENSIONS = 768
const OPENCLAW_INPUT_FILE_MAX_BYTES = 5 * 1024 * 1024

@Injectable()
export class MediaIndexerService {
  private readonly logger = new Logger(MediaIndexerService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly reader: MediaReaderService,
    private readonly mediaRepository: MediaRepository,
    private readonly errorReporter: ErrorReporter,
    private readonly documentExtraction: DocumentExtractionService,
    @Optional() private readonly creditsService?: CreditsService,
  ) {}

  async indexAsset(assetId: string): Promise<void> {
    const now = new Date().toISOString()
    const asset = await this.reader.getAssetMetadata(assetId)
    if (!asset) return
    const isPdf =
      asset.mime_type === 'application/pdf' ||
      asset.original_filename?.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      await this.mediaRepository.updateAssetIndex(assetId, {
        index_error: null,
        document_intelligence: {
          status: 'processing',
          strategy: 'metadata_only',
          text_quality: 'empty',
          reason: 'indexing_started',
          confidence: 0,
          chars: 0,
          page_count: null,
          processed_at: now,
        } satisfies DocumentIntelligenceMetadata,
      })
    }

    const basePatch: Record<string, unknown> = {
      indexed_at: now,
      index_error: null,
    }

    try {
      let pageCount: number | null = null
      let textLayer: string | null = null
      let outline: unknown[] | null = null
      let vectorChunks: Array<{ pageNumber: number | null; content: string }> = []
      let documentIntelligence: DocumentIntelligenceMetadata | null = null

      if (isPdf) {
        const downloaded = await this.reader.downloadBuffer(assetId)
        if (!downloaded) throw new Error('Failed to download PDF for indexing')

        pageCount = await this.reader.countPdfPages(downloaded.buffer)
        outline = []

        let nativeText = ''
        let nativeAssessment: DocumentTextQualityAssessment = assessDocumentTextQuality({
          text: '',
          pageCount,
          mimeType: 'application/pdf',
          filename: asset.original_filename,
        })

        if (
          downloaded.buffer.length <= CHEAP_TEXT_EXTRACT_MAX_BYTES &&
          pageCount <= CHEAP_TEXT_EXTRACT_MAX_PAGES
        ) {
          nativeText = await this.reader.extractPdfText(downloaded.buffer)
          nativeAssessment = assessDocumentTextQuality({
            text: nativeText,
            pageCount,
            mimeType: 'application/pdf',
            filename: asset.original_filename,
          })
          if (nativeAssessment.quality === 'usable') {
            textLayer = nativeText.slice(0, MAX_TEXT_LAYER_CHARS)
            vectorChunks = await this.buildPdfVectorChunks(
              downloaded.buffer,
              pageCount,
              asset.original_filename,
            )
            documentIntelligence = buildDocumentIntelligenceMetadata({
              status: 'ready',
              strategy: 'native_text',
              assessment: nativeAssessment,
              nativeChars: nativeText.length,
              processedAt: new Date().toISOString(),
            })
          }
        }

        if (!textLayer) {
          let ocrText = ''
          let ocrError: string | null = null
          try {
            ocrText = await this.documentExtraction.extractText(
              downloaded.buffer,
              'application/pdf',
              asset.original_filename ?? asset.name,
              {
                userId: asset.user_id,
                orgId: asset.org_id ?? undefined,
                campaignId: asset.campaign_id ?? undefined,
                feature: 'media',
                action: 'document_index_ocr',
              },
            )
          } catch (error) {
            ocrError = error instanceof Error ? error.message : String(error)
          }

          const ocrAssessment = assessDocumentTextQuality({
            text: ocrText,
            pageCount,
            mimeType: 'application/pdf',
            filename: asset.original_filename,
          })
          if (ocrAssessment.quality === 'usable') {
            textLayer = ocrText.slice(0, MAX_TEXT_LAYER_CHARS)
            vectorChunks = this.chunkText(textLayer, MAX_VECTOR_CHUNK_CHARS)
              .slice(0, MAX_VECTOR_CHUNKS)
              .map((content) => ({ pageNumber: null, content }))
            documentIntelligence = buildDocumentIntelligenceMetadata({
              status: 'ready',
              strategy: 'ocr',
              assessment: ocrAssessment,
              nativeChars: nativeText.length,
              ocrChars: ocrText.length,
              processedAt: new Date().toISOString(),
            })
          } else {
            const nativeFileEligible = downloaded.buffer.length <= OPENCLAW_INPUT_FILE_MAX_BYTES
            documentIntelligence = buildDocumentIntelligenceMetadata({
              status: nativeFileEligible ? 'ready' : 'failed',
              strategy: nativeFileEligible ? 'native_file' : 'metadata_only',
              assessment: ocrAssessment.quality === 'empty' ? nativeAssessment : ocrAssessment,
              nativeChars: nativeText.length,
              ocrChars: ocrText.length,
              processedAt: new Date().toISOString(),
              error: ocrError ?? undefined,
            })
          }
        }
      } else if (asset.mime_type.startsWith('image/')) {
        pageCount = 1
      }

      const patch: Record<string, unknown> = {
        ...basePatch,
        page_count: pageCount,
        outline,
        text_layer: textLayer,
        ...(documentIntelligence ? { document_intelligence: documentIntelligence } : {}),
      }

      const { error } = await this.mediaRepository.updateAssetIndex(assetId, patch)
      if (error) {
        this.logger.warn(`indexAsset update failed asset=${assetId}: ${error.message}`)
        this.errorReporter.report({
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'media/indexer',
          error_code: 'index_update_failed',
          message: error.message,
          user_id: asset.user_id,
          context: { assetId },
        })
      }

      await this.replaceAssetVectorChunks(
        asset.id,
        asset.user_id,
        asset.org_id ?? null,
        asset.campaign_id ?? null,
        vectorChunks,
      )
    } catch (error) {
      const errText = error instanceof Error ? error.message : String(error)
      this.logger.warn(`indexAsset failed asset=${assetId}: ${errText}`)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'media/indexer',
        error_code: 'index_asset_failed',
        message: errText,
        stack: error instanceof Error ? error.stack : undefined,
        user_id: asset.user_id,
        context: { assetId, orgId: asset.org_id },
      })
      await this.mediaRepository.updateAssetIndex(assetId, {
        indexed_at: now,
        index_error: errText.slice(0, 500),
        ...(isPdf
          ? {
              document_intelligence: buildDocumentIntelligenceMetadata({
                status: 'failed',
                strategy: 'metadata_only',
                assessment: assessDocumentTextQuality({
                  text: '',
                  pageCount: null,
                  mimeType: 'application/pdf',
                  filename: asset.original_filename,
                }),
                processedAt: new Date().toISOString(),
                error: errText.slice(0, 500),
              }),
            }
          : {}),
      })
    }
  }

  private async buildPdfVectorChunks(
    buffer: Buffer,
    pageCount: number,
    filename?: string | null,
  ): Promise<Array<{ pageNumber: number | null; content: string }>> {
    const chunks: Array<{ pageNumber: number | null; content: string }> = []
    const pageLimit = Math.min(pageCount, MAX_VECTOR_INDEX_PAGES)

    for (let page = 1; page <= pageLimit; page += 1) {
      let pageText = ''
      try {
        const singlePage = await this.reader.getPagesFromPdf(buffer, [page, page])
        pageText = await this.reader.extractPdfText(singlePage)
      } catch {
        pageText = ''
      }
      const assessment = assessDocumentTextQuality({
        text: pageText,
        pageCount: 1,
        mimeType: 'application/pdf',
        filename,
      })
      if (assessment.quality !== 'usable') continue
      const pageChunks = this.chunkText(pageText, MAX_VECTOR_CHUNK_CHARS)
      for (const chunk of pageChunks) {
        chunks.push({ pageNumber: page, content: chunk })
        if (chunks.length >= MAX_VECTOR_CHUNKS) return chunks
      }
    }

    return chunks
  }

  private chunkText(text: string, maxChars: number): string[] {
    const cleaned = text.replace(/\r/g, '').trim()
    if (!cleaned) return []

    const parts = cleaned
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)

    if (parts.length === 0) return []

    const chunks: string[] = []
    let current = ''

    for (const part of parts) {
      if (part.length > maxChars) {
        if (current) {
          chunks.push(current)
          current = ''
        }
        let remaining = part
        while (remaining.length > maxChars) {
          let splitAt = remaining.lastIndexOf(' ', maxChars)
          if (splitAt <= 0) splitAt = maxChars
          chunks.push(remaining.slice(0, splitAt).trim())
          remaining = remaining.slice(splitAt).trim()
        }
        if (remaining) current = remaining
        continue
      }

      const candidate = current ? `${current}\n\n${part}` : part
      if (candidate.length > maxChars && current) {
        chunks.push(current)
        current = part
      } else {
        current = candidate
      }
    }

    if (current) chunks.push(current)
    return chunks
  }

  private async createEmbedding(text: string): Promise<number[] | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) return null

    const cleaned = text.trim()
    if (!cleaned) return null

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: cleaned.slice(0, MAX_VECTOR_EMBED_INPUT_CHARS) }] },
            outputDimensionality: EMBEDDING_DIMENSIONS,
            taskType: 'RETRIEVAL_DOCUMENT',
          }),
        },
      )
      if (!response.ok) return null
      const payload = (await response.json()) as { embedding?: { values?: number[] } }
      const vector = payload.embedding?.values
      return Array.isArray(vector) && vector.length === EMBEDDING_DIMENSIONS ? vector : null
    } catch {
      return null
    }
  }

  private async replaceAssetVectorChunks(
    assetId: string,
    userId: string,
    orgId: string | null,
    campaignId: string | null,
    chunks: Array<{ pageNumber: number | null; content: string }>,
  ): Promise<void> {
    const { error: deleteError } = await this.mediaRepository.deleteAssetChunks(assetId)
    if (deleteError) {
      this.logger.warn(`chunk delete failed asset=${assetId}: ${deleteError.message}`)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'media/indexer',
        error_code: 'chunk_delete_failed',
        message: deleteError.message,
        user_id: userId,
        context: { assetId },
      })
      return
    }
    if (chunks.length === 0) return

    const rows: Array<Record<string, unknown>> = []
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]!
      const embedding = await this.createEmbedding(chunk.content)
      if (!embedding) continue
      const inputTokens = Math.max(1, Math.ceil(chunk.content.length / 4))
      if (!this.creditsService) {
        if (process.env.NODE_ENV !== 'test') {
          throw new Error('media_indexer_billing_service_not_configured')
        }
      } else {
        await this.creditsService.processDirectTextUsage({
          userId,
          orgId: orgId ?? undefined,
          campaignId: campaignId ?? undefined,
          feature: 'media',
          action: 'document_index_embedding',
          modelName: 'gemini-embedding-2',
          usage: {
            input: inputTokens,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: inputTokens,
          },
          costSource: 'char_estimate',
          metadata: {
            asset_id: assetId,
            chunk_index: i,
            page_number: chunk.pageNumber,
          },
        })
      }
      rows.push({
        asset_id: assetId,
        user_id: userId,
        org_id: orgId,
        page_number: chunk.pageNumber,
        chunk_index: i,
        content: chunk.content,
        embedding: JSON.stringify(embedding),
      })
    }

    if (rows.length === 0) return
    const { error: insertError } = await this.mediaRepository.insertAssetChunks(rows)
    if (insertError) {
      this.logger.warn(`chunk insert failed asset=${assetId}: ${insertError.message}`)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'media/indexer',
        error_code: 'chunk_insert_failed',
        message: insertError.message,
        user_id: userId,
        context: { assetId, rowCount: rows.length },
      })
    }
  }
}
