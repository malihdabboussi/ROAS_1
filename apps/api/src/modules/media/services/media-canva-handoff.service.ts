import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { MediaRepository } from '../repositories/media.repository'
import {
  asRecord,
  asString,
  findNestedString,
  unwrapComposioPayload,
} from './media-canva-composio-payload'
import { MediaReaderService } from './media-reader.service'
import { MediaService } from './media.service'

type CanvaConnection = {
  executionUserId: string
  connectedAccountId: string
}

export type MediaCanvaHandoffResult =
  | { success: true; edit_url: string; design_id?: string }
  | { success: false; error: string; code?: 'NOT_CONNECTED' | 'HANDOFF_FAILED' }

const POLL_ATTEMPTS = 30
const POLL_DELAY_MS = 1500
const SIGNED_URL_TTL_SECONDS = 60 * 60

@Injectable()
export class MediaCanvaHandoffService {
  private readonly logger = new Logger(MediaCanvaHandoffService.name)

  constructor(
    private readonly composio: ComposioService,
    private readonly mediaService: MediaService,
    private readonly mediaReader: MediaReaderService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  async createHandoff(
    user: { id: string },
    scope: RequestScope,
    assetId: string,
  ): Promise<MediaCanvaHandoffResult> {
    const asset = await this.mediaService.getAsset(assetId, user, scope.orgId)
    if (!asset) {
      throw new BadRequestException('Asset not found')
    }
    if (asset.asset_type !== 'image') {
      throw new BadRequestException('Only image assets can open in Canva')
    }

    const connection = await this.resolveCanvaConnection(user.id, scope)
    if (!connection) {
      return {
        success: false,
        code: 'NOT_CONNECTED',
        error: 'Canva is not connected. Connect it in Settings first.',
      }
    }

    const imageUrl =
      (await this.mediaReader.getSignedUrl(assetId, SIGNED_URL_TTL_SECONDS)) ??
      asString(asset.public_url)
    if (!imageUrl || !imageUrl.startsWith('https://')) {
      return {
        success: false,
        code: 'HANDOFF_FAILED',
        error: 'Could not resolve a public HTTPS URL for this image.',
      }
    }

    const title = (asset.name || asset.original_filename || 'Vibey image').slice(0, 255)

    try {
      const jobRaw = await this.composio.executeTool(
        'CANVA_CREATE_URL_ASSET_UPLOAD_JOB',
        connection.executionUserId,
        { url: imageUrl, name: title },
        connection.connectedAccountId,
      )
      const jobId = this.extractJobId(unwrapComposioPayload(jobRaw))
      if (!jobId) {
        return {
          success: false,
          code: 'HANDOFF_FAILED',
          error: 'Canva did not return an upload job id.',
        }
      }

      const canvaAssetId = await this.pollUrlAssetUpload(
        connection,
        jobId,
      )
      if (!canvaAssetId) {
        return {
          success: false,
          code: 'HANDOFF_FAILED',
          error: 'Canva asset import timed out or failed.',
        }
      }

      const width = clampDimension(asset.width, 1080)
      const height = clampDimension(asset.height, 1080)
      const designRaw = await this.composio.executeTool(
        'CANVA_POST_DESIGNS',
        connection.executionUserId,
        {
          title,
          asset_id: canvaAssetId,
          design_type: { type: 'custom', width, height },
        },
        connection.connectedAccountId,
      )
      const designPayload = unwrapComposioPayload(designRaw)
      const editUrl = this.extractEditUrl(designPayload)
      const designId = findNestedString(designPayload, ['id', 'design_id', 'designId'])

      if (!editUrl) {
        if (designId) {
          return {
            success: true,
            edit_url: `https://www.canva.com/design/${designId}/edit`,
            design_id: designId,
          }
        }
        return {
          success: false,
          code: 'HANDOFF_FAILED',
          error: 'Canva created a design but did not return an edit URL.',
        }
      }

      return {
        success: true,
        edit_url: editUrl,
        ...(designId ? { design_id: designId } : {}),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canva handoff failed'
      this.logger.warn(`Canva handoff failed for asset ${assetId}: ${message}`)
      return { success: false, code: 'HANDOFF_FAILED', error: message }
    }
  }

  private async resolveCanvaConnection(
    userId: string,
    scope: RequestScope,
  ): Promise<CanvaConnection | null> {
    let query = this.mediaRepository.client
      .from('user_integrations')
      .select('id, user_id, status, metadata, scope_mode, is_default, updated_at')
      .eq('integration_id', 'canva')

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error || !data?.length) return null

    const rows = (data as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })

    const row = pickPreferredConnectionRow(rows, userId)
    if (!row) return null
    if (String(row.status ?? '').toLowerCase() !== 'connected') return null

    const metadata = asRecord(row.metadata) ?? {}
    const connectedAccountId = asString(metadata.composio_connected_account_id)
    if (!connectedAccountId) return null

    const executionUserId =
      String(row.scope_mode ?? '') === 'org_shared'
        ? String(row.user_id ?? userId)
        : userId

    return { executionUserId, connectedAccountId }
  }

  private async pollUrlAssetUpload(
    connection: CanvaConnection,
    jobId: string,
  ): Promise<string | null> {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const raw = await this.composio.executeTool(
        'CANVA_GET_URL_ASSET_UPLOADS_JOBID',
        connection.executionUserId,
        { jobId },
        connection.connectedAccountId,
      )
      const payload = unwrapComposioPayload(raw)
      const status = (
        findNestedString(payload, ['status', 'job_status', 'state']) ?? ''
      ).toLowerCase()
      const assetId = this.extractUploadedAssetId(payload)

      if (status === 'success' || status === 'completed' || status === 'succeeded') {
        return assetId
      }
      if (status === 'failed' || status === 'error') {
        return null
      }
      if (assetId && (status === '' || status === 'in_progress' || status === 'importing')) {
        const record = asRecord(payload)
        if (record && ('asset' in record || 'asset_id' in record)) {
          return assetId
        }
      }

      await sleep(POLL_DELAY_MS)
    }
    return null
  }

  private extractJobId(payload: unknown): string | null {
    const record = asRecord(payload)
    const job = asRecord(record?.job)
    return (
      asString(job?.id) ??
      asString(record?.jobId) ??
      asString(record?.job_id) ??
      asString(record?.id) ??
      findNestedString(payload, ['jobId', 'job_id'])
    )
  }

  private extractUploadedAssetId(payload: unknown): string | null {
    const record = asRecord(payload)
    const asset = asRecord(record?.asset) ?? asRecord(asRecord(record?.job)?.asset)
    return (
      asString(asset?.id) ??
      asString(record?.asset_id) ??
      asString(record?.assetId) ??
      findNestedString(payload, ['asset_id', 'assetId'])
    )
  }

  private extractEditUrl(payload: unknown): string | null {
    const record = asRecord(payload)
    const design = asRecord(record?.design)
    const urls = asRecord(record?.urls) ?? asRecord(design?.urls)
    return (
      asString(record?.edit_url) ??
      asString(record?.editUrl) ??
      asString(record?.edit_design_url) ??
      asString(urls?.edit_url) ??
      asString(urls?.edit) ??
      asString(urls?.editUrl) ??
      findNestedString(payload, ['edit_url', 'editUrl', 'edit_design_url'])
    )
  }
}

function pickPreferredConnectionRow(
  rows: Array<Record<string, unknown>>,
  userId: string,
): Record<string, unknown> | null {
  if (rows.length === 0) return null
  const connected = rows.filter(
    (row) => String(row.status ?? '').toLowerCase() === 'connected',
  )
  const personal = connected.find(
    (row) =>
      String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
  )
  if (personal) return personal
  const sharedDefault = connected.find(
    (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
  )
  if (sharedDefault) return sharedDefault
  const shared = connected.find((row) => String(row.scope_mode ?? '') === 'org_shared')
  if (shared) return shared
  return connected[0] ?? rows[0] ?? null
}

function clampDimension(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(8000, Math.max(40, Math.round(value)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
