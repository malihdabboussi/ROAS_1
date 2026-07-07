import { Injectable, Logger } from '@nestjs/common'
import { PDFDocument } from 'pdf-lib'
import type { MediaAssetRow } from '../dto'
import { MediaRepository } from '../repositories/media.repository'

@Injectable()
export class MediaReaderService {
  private readonly logger = new Logger(MediaReaderService.name)

  constructor(private readonly mediaRepository: MediaRepository) {}

  async getAssetMetadata(assetId: string): Promise<MediaAssetRow | null> {
    return this.mediaRepository.getAssetMetadata(assetId)
  }

  async getSignedUrl(assetId: string, ttlSeconds = 24 * 60 * 60): Promise<string | null> {
    const asset = await this.getAssetMetadata(assetId)
    if (!asset) return null
    return this.mediaRepository.createAssetSignedUrl(asset, ttlSeconds)
  }

  async downloadBuffer(
    assetId: string,
  ): Promise<{ asset: MediaAssetRow; buffer: Buffer; mimeType: string; filename: string } | null> {
    const asset = await this.getAssetMetadata(assetId)
    if (!asset) return null
    const blob = await this.mediaRepository.downloadAsset(asset)
    if (!blob) return null
    const arr = await blob.arrayBuffer()
    return {
      asset,
      buffer: Buffer.from(arr),
      mimeType: asset.mime_type,
      filename: asset.original_filename || asset.name || 'file',
    }
  }

  async countPdfPages(buffer: Buffer): Promise<number> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    return doc.getPageCount()
  }

  async getPagesFromPdf(buffer: Buffer, range: [number, number]): Promise<Buffer> {
    const source = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const out = await PDFDocument.create()
    const total = source.getPageCount()
    const start = Math.max(1, Math.min(total, Math.floor(range[0])))
    const end = Math.max(start, Math.min(total, Math.floor(range[1])))
    const indexes: number[] = []
    for (let page = start; page <= end; page++) indexes.push(page - 1)
    const copied = await out.copyPages(source, indexes)
    for (const page of copied) out.addPage(page)
    return Buffer.from(await out.save())
  }

  async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const mod = await import('pdf-parse')
      const pdfParse = typeof mod.default === 'function' ? mod.default : (mod as any)
      const result = await pdfParse(buffer)
      return String(result?.text ?? '').trim()
    } catch (error) {
      this.logger.warn(
        `extractPdfText failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return ''
    }
  }
}
