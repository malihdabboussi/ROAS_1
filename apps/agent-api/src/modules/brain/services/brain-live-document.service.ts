import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assessDocumentTextQuality } from '@vibey/api-shared'
import { BrainLiveDocumentRepository } from '../repositories/brain-live-document.repository'
import { BrainLiveInstructionService } from './brain-live-instruction.service'
import type { LiveSession } from './brain-live.types'
import { EmbeddingService } from './embedding.service'

interface ExecuteReadFileInput {
  instructionService: BrainLiveInstructionService
  agentKey: string
  filePath: string
}

interface ExecuteReadDocumentInput {
  session: LiveSession
  args: Record<string, unknown>
  supabase: SupabaseClient
  documentRepository: BrainLiveDocumentRepository
  embeddingService: EmbeddingService
}

@Injectable()
export class BrainLiveDocumentService {
  executeReadFile(input: ExecuteReadFileInput): Record<string, unknown> {
    const baseDir = input.instructionService.resolveAgentWorkspaceDir(input.agentKey)
    if (!baseDir) return { success: false, error: 'Agent workspace not found' }

    const resolved = join(baseDir, input.filePath)
    if (!resolved.startsWith(baseDir)) {
      return { success: false, error: 'Path traversal not allowed' }
    }

    if (!existsSync(resolved)) {
      return { success: false, error: `File not found: ${input.filePath}` }
    }

    try {
      const content = readFileSync(resolved, 'utf-8')
      return { success: true, file_path: input.filePath, content }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Read failed' }
    }
  }

  async executeReadDocument(input: ExecuteReadDocumentInput): Promise<Record<string, unknown>> {
    const { args, documentRepository, embeddingService, session, supabase } = input
    const assetId = String(args.asset_id ?? '').trim()
    if (!assetId) return { success: false, error: 'asset_id is required' }
    const mode = String(args.mode ?? 'read').toLowerCase()

    const { data: asset, error } = await documentRepository.findMediaAsset(supabase, {
      assetId,
      userId: session.userId,
      orgId: session.orgId,
    })
    if (error || !asset) return { success: false, error: 'Asset not found' }

    const signedUrl = await documentRepository.createSignedUrl(supabase, {
      bucketName: String(asset.bucket_name),
      filePath: String(asset.file_path),
      expiresInSeconds: 24 * 60 * 60,
    })

    const assetMeta = {
      id: String(asset.id),
      filename: String(asset.original_filename ?? asset.name ?? 'file'),
      mime_type: String(asset.mime_type ?? ''),
      size_bytes: Number(asset.file_size ?? 0),
      page_count: asset.page_count == null ? null : Number(asset.page_count),
      outline: Array.isArray(asset.outline) ? asset.outline : [],
      url: signedUrl ?? asset.public_url ?? null,
      document_intelligence:
        asset.document_intelligence && typeof asset.document_intelligence === 'object'
          ? asset.document_intelligence
          : null,
    }

    if (mode === 'describe') {
      return { success: true, mode, asset: assetMeta }
    }

    const indexedText = typeof asset.text_layer === 'string' ? asset.text_layer.trim() : ''
    const indexedAssessment = assessDocumentTextQuality({
      text: indexedText,
      pageCount: assetMeta.page_count,
      mimeType: assetMeta.mime_type,
      filename: assetMeta.filename,
    })
    const usableIndexedText = indexedAssessment.quality === 'usable' ? indexedText : ''
    if (mode === 'search') {
      const q = String(args.query ?? '').trim()
      if (!q) return { success: false, error: 'query is required for mode=search' }

      let vectorMatches: Array<{ page: number | null; snippet: string; score: number }> = []
      const queryEmbedding = await embeddingService.getEmbedding(q, {
        taskType: 'RETRIEVAL_QUERY',
      })
      if (usableIndexedText && queryEmbedding && queryEmbedding.length > 0) {
        const rows = await documentRepository.searchMediaAssetChunks(supabase, {
          assetId,
          userId: session.userId,
          orgId: session.orgId ?? null,
          queryEmbedding: `[${queryEmbedding.join(',')}]`,
          matchCount: 5,
          minSimilarity: 0.3,
        })
        vectorMatches = rows
          .map((row: Record<string, unknown>) => ({
            page:
              row.page_number == null || !Number.isFinite(Number(row.page_number))
                ? null
                : Number(row.page_number),
            snippet: String(row.snippet ?? '').slice(0, 500),
            score: Number(row.similarity ?? 0),
          }))
          .filter((row) => row.snippet.length > 0)
      }

      if (vectorMatches.length > 0) {
        return { success: true, mode, asset: assetMeta, matches: vectorMatches }
      }

      const idx = usableIndexedText.toLowerCase().indexOf(q.toLowerCase())
      if (idx < 0) return { success: true, mode, asset: assetMeta, matches: [] }
      const snippet = usableIndexedText.slice(
        Math.max(0, idx - 200),
        Math.min(usableIndexedText.length, idx + 400),
      )
      return { success: true, mode, asset: assetMeta, matches: [{ page: 1, snippet, score: 1 }] }
    }

    if (usableIndexedText) {
      return {
        success: true,
        mode: 'read',
        asset: assetMeta,
        text_content: usableIndexedText,
        content_ref: {
          type: 'signed_url',
          mime_type: assetMeta.mime_type,
          url: assetMeta.url,
        },
      }
    }

    if (assetMeta.mime_type.startsWith('text/') && assetMeta.size_bytes <= 2 * 1024 * 1024) {
      const download = await documentRepository.downloadStorageObject(supabase, {
        bucketName: String(asset.bucket_name),
        filePath: String(asset.file_path),
      })
      if (!download.error && download.data) {
        const text = new TextDecoder().decode(await download.data.arrayBuffer())
        return {
          success: true,
          mode: 'read',
          asset: assetMeta,
          text_content: text,
          content_ref: {
            type: 'signed_url',
            mime_type: assetMeta.mime_type,
            url: assetMeta.url,
          },
        }
      }
    }

    return {
      success: true,
      mode: 'read',
      asset: assetMeta,
      content_ref: {
        type: 'signed_url',
        mime_type: assetMeta.mime_type,
        url: assetMeta.url,
      },
    }
  }
}
