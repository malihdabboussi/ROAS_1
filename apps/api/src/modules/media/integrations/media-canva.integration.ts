import { BadRequestException, Injectable } from '@nestjs/common'
import { ComposioService } from '../../composio/services/composio.service'
import {
  asRecord,
  asString,
  findNestedString,
  unwrapComposioPayload,
} from '../services/media-canva-composio-payload'

export type CanvaConnection = {
  executionUserId: string
  connectedAccountId: string
}

export type CanvaDesignResult = {
  editUrl: string
  designId?: string
}

const CANVA_API_ROOT = 'https://api.canva.com/rest/v1'
const POLL_ATTEMPTS = 30
const POLL_DELAY_MS = 1500

@Injectable()
export class MediaCanvaIntegration {
  constructor(private readonly composio: ComposioService) {}

  async createImageDesign(options: {
    connection: CanvaConnection
    imageUrl: string
    title: string
    width: number
    height: number
  }): Promise<CanvaDesignResult> {
    const { connection, imageUrl, title, width, height } = options
    const jobRaw = await this.composio.executeTool(
      'CANVA_CREATE_URL_ASSET_UPLOAD_JOB',
      connection.executionUserId,
      { url: imageUrl, name: title },
      connection.connectedAccountId,
    )
    const jobId = extractJobId(unwrapComposioPayload(jobRaw))
    if (!jobId) throw new BadRequestException('Canva did not return an upload job id.')

    const canvaAssetId = await this.pollImageUpload(connection, jobId)
    if (!canvaAssetId) throw new BadRequestException('Canva asset import timed out or failed.')

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
    return extractDesignResult(unwrapComposioPayload(designRaw))
  }

  async importDesign(options: {
    connection: CanvaConnection
    buffer: Buffer
    mimeType: string
    title: string
  }): Promise<CanvaDesignResult> {
    const { connection, buffer, mimeType, title } = options
    const accessToken = await this.composio.getAccessTokenForToolkit(
      connection.executionUserId,
      'canva',
      connection.connectedAccountId,
    )
    if (!accessToken) throw new BadRequestException('Canva connection needs to be refreshed.')

    const response = await fetch(`${CANVA_API_ROOT}/imports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Import-Metadata': JSON.stringify({
          title_base64: Buffer.from(title.slice(0, 50), 'utf8').toString('base64'),
          mime_type: mimeType,
        }),
      },
      body: new Uint8Array(buffer),
    })
    const payload = await readCanvaResponse(response)
    const jobId = extractJobId(payload)
    if (!jobId) throw new BadRequestException('Canva did not return an import job id.')

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const pollResponse = await fetch(`${CANVA_API_ROOT}/imports/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const pollPayload = await readCanvaResponse(pollResponse)
      const job = asRecord(asRecord(pollPayload)?.job) ?? asRecord(pollPayload)
      const status = asString(job?.status)?.toLowerCase() ?? ''
      if (status === 'success') return extractDesignResult(job)
      if (status === 'failed') {
        const error = asRecord(job?.error)
        throw new BadRequestException(
          asString(error?.message) ?? 'Canva could not import this file.',
        )
      }
      await sleep(POLL_DELAY_MS)
    }

    throw new BadRequestException('Canva design import timed out.')
  }

  private async pollImageUpload(
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
      const assetId = extractUploadedAssetId(payload)

      if (['success', 'completed', 'succeeded'].includes(status)) return assetId
      if (['failed', 'error'].includes(status)) return null
      if (assetId && ['', 'in_progress', 'importing'].includes(status)) return assetId
      await sleep(POLL_DELAY_MS)
    }
    return null
  }
}

async function readCanvaResponse(response: Response): Promise<unknown> {
  const payload = (await response.json().catch(() => null)) as unknown
  if (response.ok) return payload
  const record = asRecord(payload)
  const error = asRecord(record?.error)
  throw new BadRequestException(
    asString(error?.message) ?? asString(record?.message) ?? 'Canva import failed.',
  )
}

function extractJobId(payload: unknown): string | null {
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

function extractUploadedAssetId(payload: unknown): string | null {
  const record = asRecord(payload)
  const asset = asRecord(record?.asset) ?? asRecord(asRecord(record?.job)?.asset)
  return (
    asString(asset?.id) ??
    asString(record?.asset_id) ??
    asString(record?.assetId) ??
    findNestedString(payload, ['asset_id', 'assetId'])
  )
}

function extractDesignResult(payload: unknown): CanvaDesignResult {
  const record = asRecord(payload)
  const result = asRecord(record?.result)
  const designs = Array.isArray(result?.designs) ? result.designs : []
  const design = asRecord(designs[0]) ?? asRecord(record?.design) ?? record
  const urls = asRecord(design?.urls) ?? asRecord(record?.urls)
  const editUrl =
    asString(urls?.edit_url) ??
    asString(record?.edit_url) ??
    findNestedString(payload, ['edit_url', 'editUrl', 'edit_design_url'])
  const designId = asString(design?.id) ?? findNestedString(payload, ['design_id', 'designId'])
  if (!editUrl && designId) {
    return { editUrl: `https://www.canva.com/design/${designId}/edit`, designId }
  }
  if (!editUrl) throw new BadRequestException('Canva did not return an edit URL.')
  return { editUrl, ...(designId ? { designId } : {}) }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
