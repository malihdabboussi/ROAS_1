import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import {
  MediaCanvaIntegration,
  type CanvaConnection,
} from '../integrations/media-canva.integration'
import { MediaCanvaRepository } from '../repositories/media-canva.repository'
import { asRecord, asString } from './media-canva-composio-payload'
import { MediaReaderService } from './media-reader.service'
import { MediaService } from './media.service'

export type MediaCanvaHandoffResult =
  | { success: true; edit_url: string; design_id?: string }
  | { success: false; error: string; code?: 'NOT_CONNECTED' | 'HANDOFF_FAILED' }

const SIGNED_URL_TTL_SECONDS = 60 * 60
const SUPPORTED_DESIGN_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.text',
])

@Injectable()
export class MediaCanvaHandoffService {
  private readonly logger = new Logger(MediaCanvaHandoffService.name)

  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaReader: MediaReaderService,
    private readonly canvaRepository: MediaCanvaRepository,
    private readonly canvaIntegration: MediaCanvaIntegration,
  ) {}

  async createImageHandoff(
    user: { id: string },
    scope: RequestScope,
    assetId: string,
  ): Promise<MediaCanvaHandoffResult> {
    const asset = await this.mediaService.getAsset(assetId, user, scope.orgId)
    if (!asset) throw new BadRequestException('Asset not found')
    if (asset.asset_type !== 'image') {
      throw new BadRequestException('Only image assets can open in Canva')
    }

    const connection = await this.resolveCanvaConnection(user.id, scope)
    if (!connection) return notConnectedResult()

    const imageUrl =
      (await this.mediaReader.getSignedUrl(assetId, SIGNED_URL_TTL_SECONDS)) ??
      asString(asset.public_url)
    if (!imageUrl?.startsWith('https://')) {
      return handoffFailedResult('Could not resolve a public HTTPS URL for this image.')
    }

    const title = (asset.name || asset.original_filename || 'Vibey image').slice(0, 255)
    try {
      const result = await this.canvaIntegration.createImageDesign({
        connection,
        imageUrl,
        title,
        width: clampDimension(asset.width, 1080),
        height: clampDimension(asset.height, 1080),
      })
      return successResult(result.editUrl, result.designId)
    } catch (error) {
      return this.handleFailure(`asset ${assetId}`, error)
    }
  }

  async importDesign(
    user: { id: string },
    scope: RequestScope,
    file: { buffer: Buffer; mimeType: string; title: string },
  ): Promise<MediaCanvaHandoffResult> {
    if (!SUPPORTED_DESIGN_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException(
        'Canva import supports DOCX, PPTX, PDF, DOC, PPT, ODT, and ODP files.',
      )
    }
    const connection = await this.resolveCanvaConnection(user.id, scope)
    if (!connection) return notConnectedResult()

    try {
      const result = await this.canvaIntegration.importDesign({
        connection,
        buffer: file.buffer,
        mimeType: file.mimeType,
        title: file.title.trim() || 'Vibey design',
      })
      return successResult(result.editUrl, result.designId)
    } catch (error) {
      return this.handleFailure(`design ${file.title}`, error)
    }
  }

  private async resolveCanvaConnection(
    userId: string,
    scope: RequestScope,
  ): Promise<CanvaConnection | null> {
    const data = await this.canvaRepository.listConnections(userId, scope)
    const rows = data.filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      return scopeMode === 'personal' && String(row.user_id ?? '') === userId
    })

    const row = pickPreferredConnectionRow(rows, userId)
    if (!row || String(row.status ?? '').toLowerCase() !== 'connected') return null
    const metadata = asRecord(row.metadata) ?? {}
    const connectedAccountId = asString(metadata.composio_connected_account_id)
    if (!connectedAccountId) return null

    return {
      executionUserId:
        String(row.scope_mode ?? '') === 'org_shared' ? String(row.user_id ?? userId) : userId,
      connectedAccountId,
    }
  }

  private handleFailure(subject: string, error: unknown): MediaCanvaHandoffResult {
    const message = error instanceof Error ? error.message : 'Canva handoff failed'
    this.logger.warn(`Canva handoff failed for ${subject}: ${message}`)
    return handoffFailedResult(message)
  }
}

function pickPreferredConnectionRow(
  rows: Array<Record<string, unknown>>,
  userId: string,
): Record<string, unknown> | null {
  if (rows.length === 0) return null
  const connected = rows.filter((row) => String(row.status ?? '').toLowerCase() === 'connected')
  return (
    connected.find(
      (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
    ) ??
    connected.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    ) ??
    connected.find((row) => String(row.scope_mode ?? '') === 'org_shared') ??
    connected[0] ??
    rows[0] ??
    null
  )
}

function clampDimension(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(8000, Math.max(40, Math.round(value)))
}

function successResult(editUrl: string, designId?: string): MediaCanvaHandoffResult {
  return {
    success: true,
    edit_url: editUrl,
    ...(designId ? { design_id: designId } : {}),
  }
}

function notConnectedResult(): MediaCanvaHandoffResult {
  return {
    success: false,
    code: 'NOT_CONNECTED',
    error: 'Canva is not connected. Connect it in Settings first.',
  }
}

function handoffFailedResult(error: string): MediaCanvaHandoffResult {
  return { success: false, code: 'HANDOFF_FAILED', error }
}
