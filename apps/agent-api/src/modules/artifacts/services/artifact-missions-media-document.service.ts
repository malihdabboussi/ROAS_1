import { PDFDocument } from 'pdf-lib'
import {
  assessDocumentTextQuality,
  buildDocumentIntelligenceMetadata,
  type DocumentIntelligenceMetadata,
} from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { ArtifactMissionsMediaGeminiClient } from '../integrations/artifact-missions-media-gemini.client'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'

const MB = 1024 * 1024
const ASSET_METADATA_CACHE_TTL_MS = 30_000
const EMBEDDING_DIMENSIONS = 768

type ModelPdfLimits = {
  maxPages: number | null
  maxBytes: number
}

const MODEL_LIMITS: Record<string, { pdf: ModelPdfLimits }> = {
  'google/gemini-3.5-flash': { pdf: { maxPages: 3000, maxBytes: 50 * MB } },
  'gemini-2.5-flash': { pdf: { maxPages: 1000, maxBytes: 50 * MB } },
  'gemini-2.5-pro': { pdf: { maxPages: 1000, maxBytes: 50 * MB } },
  'anthropic/claude-sonnet-4.6': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4.6': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4.7': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-sonnet-4-20250514': { pdf: { maxPages: 100, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4-20250514': { pdf: { maxPages: 100, maxBytes: 32 * MB } },
  'openai/gpt-5.4': { pdf: { maxPages: null, maxBytes: 50 * MB } },
  'openai/gpt-5.4-pro': { pdf: { maxPages: null, maxBytes: 50 * MB } },
  'openai/gpt-5.5': { pdf: { maxPages: null, maxBytes: 50 * MB } },
}

type LoggerLike = { log(message: string): void }

type DocumentReadHooks = {
  extractTextViaGemini?: (buffer: Buffer, mimeType: string, filename?: string) => Promise<string>
  createQueryEmbedding?: (query: string) => Promise<number[] | null>
}

export class ArtifactMissionsMediaDocumentService {
  private readonly assetMetadataCache = new Map<
    string,
    { expiresAt: number; row: Record<string, unknown> }
  >()

  constructor(
    private readonly documentExtraction: DocumentExtractionService | undefined,
    private readonly mediaAssetsRepository: ArtifactMediaAssetsRepository,
    private readonly logger: LoggerLike,
    private readonly geminiClient = new ArtifactMissionsMediaGeminiClient(),
  ) {}

  async readDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    hooks: DocumentReadHooks = {},
  ) {
    this.logger.log(
      `read_document.call mode=${String(input.mode ?? 'read')} asset_id=${String(input.asset_id ?? '')}`,
    )
    const assetId = String(input.asset_id ?? '').trim()
    if (!assetId) return { success: false, error: 'asset_id is required' }

    const mode = String(input.mode ?? 'read')
      .trim()
      .toLowerCase()
    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null

    const assetRow = await this.getAssetRow(target, assetId, userId, orgId)
    if (!assetRow) {
      return { success: false, error: 'Asset not found' }
    }

    const signedUrl =
      (typeof assetRow.public_url === 'string' && assetRow.public_url.trim()) ||
      (await this.createAssetSignedUrl(
        target,
        String(assetRow.bucket_name),
        String(assetRow.file_path),
        24 * 60 * 60,
      ))

    const asset = {
      id: String(assetRow.id),
      filename: String(assetRow.original_filename ?? assetRow.name ?? 'file'),
      mime_type: String(assetRow.mime_type ?? ''),
      size_bytes: Number(assetRow.file_size ?? 0),
      page_count: assetRow.page_count == null ? null : Number(assetRow.page_count),
      outline: Array.isArray(assetRow.outline) ? assetRow.outline : [],
      url: signedUrl || null,
    }

    if (mode === 'describe') {
      return {
        success: true,
        mode: 'describe',
        asset,
      }
    }

    if (mode === 'search') {
      const queryText = String(input.query ?? '').trim()
      if (!queryText) return { success: false, error: 'query is required for mode=search' }

      const requestedLimit = Number(input.max_pages ?? 5)
      const matchLimit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.floor(requestedLimit), 1), 10)
        : 5
      const cachedText = typeof assetRow.text_layer === 'string' ? assetRow.text_layer.trim() : ''
      const cachedTextUsable =
        cachedText.length > 0 &&
        assessDocumentTextQuality({
          text: cachedText,
          pageCount: asset.page_count,
          mimeType: asset.mime_type,
          filename: asset.filename,
        }).quality === 'usable'

      let vectorMatches: Array<{ page: number | null; snippet: string; score: number }> = []
      const queryEmbedding = await (
        hooks.createQueryEmbedding ?? this.createQueryEmbedding.bind(this)
      )(queryText)
      if (cachedTextUsable && queryEmbedding) {
        const { data: rows } = await this.mediaAssetsRepository.searchMediaAssetChunks(
          target.serviceClient,
          {
            assetId,
            userId,
            orgId,
            queryEmbedding: `[${queryEmbedding.join(',')}]`,
            matchCount: matchLimit,
          },
        )
        vectorMatches = Array.isArray(rows)
          ? rows
              .map((row: Record<string, unknown>) => ({
                page:
                  row.page_number == null || !Number.isFinite(Number(row.page_number))
                    ? null
                    : Number(row.page_number),
                snippet: String(row.snippet ?? '').slice(0, 500),
                score: Number(row.similarity ?? 0),
              }))
              .filter((row) => row.snippet.length > 0)
          : []
      }

      if (vectorMatches.length > 0) {
        this.logger.log(
          `read_document.search_vector asset_id=${asset.id} matches=${vectorMatches.length} query_chars=${queryText.length}`,
        )
        return {
          success: true,
          mode: 'search',
          asset,
          matches: vectorMatches,
        }
      }

      const haystack = cachedTextUsable ? cachedText : ''
      const idx = haystack.toLowerCase().indexOf(queryText.toLowerCase())
      const snippet = idx >= 0 ? haystack.slice(Math.max(0, idx - 200), idx + 400) : ''
      this.logger.log(
        `read_document.search_fallback asset_id=${asset.id} found=${idx >= 0 ? 'yes' : 'no'} query_chars=${queryText.length}`,
      )
      return {
        success: true,
        mode: 'search',
        asset,
        matches: idx >= 0 ? [{ page: 1, snippet, score: 1 }] : [],
      }
    }

    const download = await this.mediaAssetsRepository.downloadStorageObject(target.serviceClient, {
      bucketName: String(assetRow.bucket_name),
      filePath: String(assetRow.file_path),
    })
    if (download.error || !download.data) {
      return { success: false, error: 'Failed to fetch document binary' }
    }
    const fileBuffer = Buffer.from(await download.data.arrayBuffer())

    if (asset.mime_type.startsWith('image/')) {
      return {
        success: true,
        mode: 'read',
        asset,
        content_ref: {
          type: 'inline_image',
          mime_type: asset.mime_type,
          data: fileBuffer.toString('base64'),
          pages_included: [1, 1],
          url: signedUrl || null,
        },
      }
    }

    if (asset.mime_type === 'application/pdf' || asset.filename.toLowerCase().endsWith('.pdf')) {
      return this.readPdfDocument(target, input, asset, assetRow, fileBuffer, signedUrl, hooks)
    }

    if (this.isPptxAsset(asset)) {
      const extractedText =
        typeof assetRow.text_layer === 'string' && assetRow.text_layer.trim().length > 0
          ? assetRow.text_layer
          : ((await this.documentExtraction?.extractText(
              fileBuffer,
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              asset.filename,
            )) ?? '')

      this.logger.log(
        `read_document.pptx_text_path asset_id=${asset.id} size=${fileBuffer.length} textChars=${extractedText.length}`,
      )

      return {
        success: true,
        mode: 'read',
        asset,
        text_content: extractedText,
        content_ref: {
          type: 'signed_url',
          mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          url: signedUrl || null,
        },
      }
    }

    const textValue =
      typeof assetRow.text_layer === 'string' && assetRow.text_layer.trim().length > 0
        ? assetRow.text_layer
        : fileBuffer.toString('utf-8')

    return {
      success: true,
      mode: 'read',
      asset,
      text_content: textValue,
      content_ref: {
        type: 'signed_url',
        mime_type: asset.mime_type,
        url: signedUrl || null,
      },
    }
  }

  async extractTextViaGemini(
    buffer: Buffer,
    mimeType: string,
    filename?: string,
    target?: Record<string, any>,
    sessionKey?: string,
  ): Promise<string> {
    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
    if (!apiKey) return ''
    const text = await this.geminiClient.extractDocumentText({ apiKey, buffer, mimeType, filename })
    if (text.trim()) {
      await this.chargeGeminiUsage(target, sessionKey, {
        action: 'read_document_ocr',
        modelName: 'gemini-3.5-flash',
        inputTokens: Math.max(1, Math.ceil(buffer.length / 4096)),
        outputTokens: Math.max(1, Math.ceil(text.length / 4)),
        metadata: { filename: filename ?? null, mime_type: mimeType },
      })
    }
    return text
  }

  async createQueryEmbedding(
    query: string,
    target?: Record<string, any>,
    sessionKey?: string,
  ): Promise<number[] | null> {
    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
    if (!apiKey) return null
    const cleaned = query.trim()
    if (!cleaned) return null
    const embedding = await this.geminiClient.createQueryEmbedding({
      apiKey,
      query: cleaned,
      dimensions: EMBEDDING_DIMENSIONS,
    })
    if (embedding) {
      const inputTokens = Math.max(1, Math.ceil(cleaned.length / 4))
      await this.chargeGeminiUsage(target, sessionKey, {
        action: 'read_document_query_embedding',
        modelName: 'gemini-embedding-2',
        inputTokens,
        outputTokens: 0,
        metadata: { query_length: cleaned.length },
      })
    }
    return embedding
  }

  private async chargeGeminiUsage(
    target: Record<string, any> | undefined,
    sessionKey: string | undefined,
    params: {
      action: string
      modelName: string
      inputTokens: number
      outputTokens: number
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    if (!target) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_document_billing_target_not_configured')
    }
    const userId = String(target.resolveUserId?.(sessionKey) ?? '').trim()
    if (!userId) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_document_billing_user_not_resolved')
    }
    const credits = target.credits
    if (!credits || typeof credits.processDirectTextUsage !== 'function') {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_document_billing_service_not_configured')
    }
    const orgId =
      sessionKey && typeof target.resolveOrgId === 'function'
        ? (target.resolveOrgId(sessionKey) as string | null)
        : null
    const conversationId =
      sessionKey && typeof target.parseConversationId === 'function'
        ? target.parseConversationId(sessionKey)
        : null
    const totalTokens = Math.max(1, params.inputTokens + params.outputTokens)
    await credits.processDirectTextUsage({
      userId,
      orgId: orgId ?? undefined,
      conversationId: conversationId ?? undefined,
      feature: 'media',
      action: params.action,
      modelName: params.modelName,
      usage: {
        input: params.inputTokens,
        output: params.outputTokens,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens,
      },
      costSource: 'char_estimate',
      metadata: params.metadata,
    })
  }

  private async readPdfDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    asset: {
      id: string
      filename: string
      mime_type: string
      size_bytes: number
      page_count: number | null
      outline: unknown[]
      url: string | null
    },
    assetRow: Record<string, unknown>,
    fileBuffer: Buffer,
    signedUrl: string | null,
    hooks: DocumentReadHooks,
  ) {
    const modelLimits = this.resolvePdfLimits(input.model_id)
    const pageCount = asset.page_count ?? (await this.countPdfPages(fileBuffer))
    const requestedMaxPages = Number(input.max_pages ?? 20)
    const maxPages = Number.isFinite(requestedMaxPages)
      ? Math.min(Math.max(Math.floor(requestedMaxPages), 1), 50)
      : 20
    const pagePlan = this.parsePageRange(input.page_range, pageCount, maxPages)
    const pageRange = pagePlan.range
    const slicedPdf = await this.slicePdf(fileBuffer, pageRange)
    const pdfWithinNativeLimits =
      slicedPdf.length <= modelLimits.maxBytes &&
      (modelLimits.maxPages == null || pageRange[1] - pageRange[0] + 1 <= modelLimits.maxPages)

    let extractedText = ''
    let documentIntelligence: DocumentIntelligenceMetadata
    try {
      const mod = await import('pdf-parse')
      const pdfParse = typeof mod.default === 'function' ? mod.default : (mod as any)
      const parsed = await pdfParse(slicedPdf)
      extractedText = String(parsed?.text ?? '').trim()
    } catch {
      extractedText = ''
    }
    const nativeAssessment = assessDocumentTextQuality({
      text: extractedText,
      pageCount: pageRange[1] - pageRange[0] + 1,
      mimeType: 'application/pdf',
      filename: asset.filename,
    })
    const nativeChars = extractedText.length
    if (nativeAssessment.quality === 'usable') {
      documentIntelligence = buildDocumentIntelligenceMetadata({
        status: 'ready',
        strategy: 'native_text',
        assessment: nativeAssessment,
        nativeChars,
      })
    } else {
      const ocrText = await (hooks.extractTextViaGemini ?? this.extractTextViaGemini.bind(this))(
        slicedPdf,
        'application/pdf',
        asset.filename,
      )
      const ocrAssessment = assessDocumentTextQuality({
        text: ocrText,
        pageCount: pageRange[1] - pageRange[0] + 1,
        mimeType: 'application/pdf',
        filename: asset.filename,
      })
      if (ocrAssessment.quality === 'usable') {
        extractedText = ocrText
        documentIntelligence = buildDocumentIntelligenceMetadata({
          status: 'ready',
          strategy: 'ocr',
          assessment: ocrAssessment,
          nativeChars,
          ocrChars: ocrText.length,
        })
      } else {
        extractedText = ''
        documentIntelligence = buildDocumentIntelligenceMetadata({
          status: pdfWithinNativeLimits ? 'ready' : 'failed',
          strategy: pdfWithinNativeLimits ? 'native_file' : 'metadata_only',
          assessment: ocrAssessment,
          nativeChars,
          ocrChars: ocrText.length,
        })
      }
    }
    this.logger.log(
      `read_document.pdf_text_path asset_id=${asset.id} pages=${pageRange[0]}-${pageRange[1]} size=${slicedPdf.length} nativeEligible=${pdfWithinNativeLimits ? 'yes' : 'no'} textChars=${extractedText.length}`,
    )
    if (pagePlan.truncated) {
      this.logger.log(`read_document.truncated asset_id=${asset.id} next=${pagePlan.nextRange}`)
    }
    return {
      success: true,
      mode: 'read',
      asset: { ...asset, page_count: pageCount },
      text_content: extractedText,
      document_intelligence: documentIntelligence,
      truncated: pagePlan.truncated,
      next_page_range: pagePlan.nextRange,
      content_ref: {
        type: 'signed_url',
        mime_type: 'application/pdf',
        url: signedUrl || null,
        pages_included: pageRange,
      },
    }
  }

  private normalizeModelId(value: unknown): string {
    if (typeof value !== 'string') return ''
    return value.trim().replace(/^openrouter\//, '')
  }

  private resolvePdfLimits(modelIdRaw: unknown): ModelPdfLimits {
    const modelId = this.normalizeModelId(modelIdRaw)
    if (!modelId) return { maxPages: 600, maxBytes: 32 * MB }
    const direct = MODEL_LIMITS[modelId]
    if (direct) return direct.pdf
    const prefixed = MODEL_LIMITS[`openrouter/${modelId}`]
    if (prefixed) return prefixed.pdf
    return { maxPages: 600, maxBytes: 32 * MB }
  }

  private parsePageRange(
    pageRangeValue: unknown,
    pageCount: number,
    maxPages: number,
  ): { range: [number, number]; truncated: boolean; nextRange: [number, number] | null } {
    const parsed =
      Array.isArray(pageRangeValue) &&
      pageRangeValue.length === 2 &&
      Number.isFinite(Number(pageRangeValue[0])) &&
      Number.isFinite(Number(pageRangeValue[1]))
        ? ([Math.floor(Number(pageRangeValue[0])), Math.floor(Number(pageRangeValue[1]))] as [
            number,
            number,
          ])
        : ([1, Math.min(pageCount, maxPages)] as [number, number])

    const start = Math.max(1, Math.min(pageCount, parsed[0]))
    const endRequested = Math.max(start, Math.min(pageCount, parsed[1]))
    const end = Math.min(endRequested, start + Math.max(0, maxPages - 1))
    const truncated = end < endRequested || end < pageCount
    const nextStart = end + 1
    const nextRange: [number, number] | null =
      nextStart <= pageCount
        ? [nextStart, Math.min(pageCount, nextStart + Math.max(0, maxPages - 1))]
        : null
    return { range: [start, end], truncated, nextRange }
  }

  private async createAssetSignedUrl(
    target: Record<string, any>,
    bucketName: string,
    filePath: string,
    ttlSeconds = 24 * 60 * 60,
  ): Promise<string> {
    const { data } = await this.mediaAssetsRepository.createStorageSignedUrl(target.serviceClient, {
      bucketName,
      filePath,
      ttlSeconds,
    })
    return data?.signedUrl ?? ''
  }

  private isPptxAsset(asset: { filename: string; mime_type: string }): boolean {
    return (
      asset.mime_type ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      asset.filename.toLowerCase().endsWith('.pptx')
    )
  }

  private getAssetCacheKey(assetId: string, userId: string, orgId: string | null): string {
    return `${userId}:${orgId ?? 'no-org'}:${assetId}`
  }

  private async getAssetRow(
    target: Record<string, any>,
    assetId: string,
    userId: string,
    orgId: string | null,
  ): Promise<Record<string, unknown> | null> {
    const cacheKey = this.getAssetCacheKey(assetId, userId, orgId)
    const cached = this.assetMetadataCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.row
    if (cached) this.assetMetadataCache.delete(cacheKey)

    const { data: assetRow, error: assetError } =
      await this.mediaAssetsRepository.findReadableMediaAsset(target.serviceClient, {
        assetId,
        userId,
        orgId,
      })
    if (assetError || !assetRow) return null

    this.assetMetadataCache.set(cacheKey, {
      expiresAt: Date.now() + ASSET_METADATA_CACHE_TTL_MS,
      row: assetRow as Record<string, unknown>,
    })
    return assetRow as Record<string, unknown>
  }

  private async countPdfPages(buffer: Buffer): Promise<number> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    return doc.getPageCount()
  }

  private async slicePdf(buffer: Buffer, pageRange: [number, number]): Promise<Buffer> {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const out = await PDFDocument.create()
    const start = Math.max(1, pageRange[0])
    const end = Math.min(src.getPageCount(), pageRange[1])
    const indexes: number[] = []
    for (let page = start; page <= end; page++) indexes.push(page - 1)
    const copied = await out.copyPages(src, indexes)
    for (const page of copied) out.addPage(page)
    return Buffer.from(await out.save())
  }
}
