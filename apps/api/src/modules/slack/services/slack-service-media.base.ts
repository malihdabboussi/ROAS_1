import { randomUUID } from 'crypto'
import type { SlackBlock, SlackFileAttachment } from '../types/slack.types'
import {
  SLACK_MAX_BLOCKS,
  SLACK_MAX_TEXT_LENGTH,
  SLACK_SECTION_MAX_LENGTH,
} from './slack-service.shared'
import { SlackAuthBase } from './slack-service-auth.base'

export abstract class SlackMediaBase extends SlackAuthBase {
  protected async sendSlackReply(
    botToken: string,
    channelId: string,
    text: string,
    threadTs: string | undefined,
  ): Promise<void> {
    const omitDownloadForUrls = await this.uploadDocumentMediaDirectivesToSlack(
      botToken,
      channelId,
      text,
      threadTs,
    )

    if (text.length <= SLACK_MAX_TEXT_LENGTH) {
      const { blocks, plainText } = this.formatResponseAsBlocks(text, omitDownloadForUrls)
      const capped = blocks.slice(0, SLACK_MAX_BLOCKS)
      await this.slackApi.postBlockMessage(botToken, channelId, plainText, capped, threadTs)
      return
    }

    const chunks = this.chunkText(text, SLACK_MAX_TEXT_LENGTH)
    for (const chunk of chunks) {
      const { blocks, plainText } = this.formatResponseAsBlocks(chunk, omitDownloadForUrls)
      const capped = blocks.slice(0, SLACK_MAX_BLOCKS)
      await this.slackApi.postBlockMessage(botToken, channelId, plainText, capped, threadTs)
    }
  }

  protected collectOutboundDocumentMediaUrls(text: string): Array<{ url: string; filename: string }> {
    const seen = new Set<string>()
    const out: Array<{ url: string; filename: string }> = []
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      const mediaMatch = SlackMediaBase.MEDIA_DIRECTIVE_PATTERN.exec(trimmed)
      if (!mediaMatch) continue
      const url = mediaMatch[1] ?? ''
      if (!url || SlackMediaBase.IMAGE_URL_EXTENSIONS.test(url)) continue
      if (seen.has(url)) continue
      seen.add(url)
      out.push({ url, filename: this.filenameFromHttpUrl(url) })
    }
    return out
  }

  protected filenameFromHttpUrl(url: string): string {
    try {
      const u = new URL(url)
      const seg = u.pathname.split('/').filter(Boolean).pop()
      if (seg) return decodeURIComponent(seg)
    } catch {
      /* invalid URL */
    }
    return 'document'
  }

  protected async fetchPublicUrlBytes(url: string): Promise<Buffer> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`fetch ${url} failed: ${res.status}`)
    }
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  }

  protected async uploadDocumentMediaDirectivesToSlack(
    botToken: string,
    channelId: string,
    text: string,
    threadTs: string | undefined,
  ): Promise<ReadonlySet<string>> {
    const uploaded = new Set<string>()
    const items = this.collectOutboundDocumentMediaUrls(text)
    for (const item of items) {
      let buffer: Buffer
      try {
        buffer = await this.fetchPublicUrlBytes(item.url)
      } catch (err) {
        this.logger.warn(
          `Slack outbound file: could not fetch ${item.url}: ${(err as Error).message}`,
        )
        continue
      }
      if (buffer.length > SlackMediaBase.SLACK_MEDIA_MAX_BYTES) {
        this.logger.warn(
          `Slack outbound file too large: ${buffer.length} bytes (limit ${SlackMediaBase.SLACK_MEDIA_MAX_BYTES})`,
        )
        continue
      }
      try {
        await this.slackApi.uploadExternalFileToChannel(
          botToken,
          channelId,
          buffer,
          item.filename,
          threadTs,
        )
        uploaded.add(item.url)
      } catch (err) {
        this.logger.warn(
          `Slack outbound file upload failed for ${item.url}: ${(err as Error).message}`,
        )
      }
    }
    return uploaded
  }

  protected static readonly MD_IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
  protected static readonly MEDIA_DIRECTIVE_PATTERN = /^MEDIA:(https?:\/\/[^\s]+)$/
  protected static readonly IMAGE_URL_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)(\?[^\s)]*)?$/i

  protected formatResponseAsBlocks(
    text: string,
    omitDownloadForUrls?: ReadonlySet<string>,
  ): { blocks: SlackBlock[]; plainText: string } {
    const blocks: SlackBlock[] = []
    const lines = text.split('\n')
    let buffer = ''

    const flushBuffer = () => {
      const content = buffer.trim()
      if (!content) return
      for (let i = 0; i < content.length; i += SLACK_SECTION_MAX_LENGTH) {
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: content.slice(i, i + SLACK_SECTION_MAX_LENGTH) },
        })
      }
      buffer = ''
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^#{1,3}\s/.test(trimmed)) {
        flushBuffer()
        const headerText = trimmed.replace(/^#{1,3}\s+/, '').slice(0, 150)
        blocks.push({
          type: 'header',
          text: { type: 'plain_text', text: headerText, emoji: true },
        })
      } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        flushBuffer()
        blocks.push({ type: 'divider' })
      } else {
        const mediaMatch = SlackMediaBase.MEDIA_DIRECTIVE_PATTERN.exec(trimmed)
        if (mediaMatch) {
          flushBuffer()
          const url = mediaMatch[1] ?? ''
          if (SlackMediaBase.IMAGE_URL_EXTENSIONS.test(url)) {
            blocks.push({ type: 'image', image_url: url, alt_text: 'Generated image' })
          } else if (!omitDownloadForUrls?.has(url)) {
            blocks.push({
              type: 'section',
              text: { type: 'mrkdwn', text: `<${url}|Download file>` },
            })
          }
          continue
        }

        let processed = trimmed
        let hasInlineImage = false
        SlackMediaBase.MD_IMAGE_PATTERN.lastIndex = 0
        let mdMatch: RegExpExecArray | null
        while ((mdMatch = SlackMediaBase.MD_IMAGE_PATTERN.exec(trimmed)) !== null) {
          const [fullMatch, alt, url] = mdMatch
          if (SlackMediaBase.IMAGE_URL_EXTENSIONS.test(url)) {
            flushBuffer()
            blocks.push({ type: 'image', image_url: url, alt_text: alt || 'Image' })
            processed = processed.replace(fullMatch, '').trim()
            hasInlineImage = true
          }
        }
        SlackMediaBase.MD_IMAGE_PATTERN.lastIndex = 0

        if (hasInlineImage && processed) {
          buffer += processed + '\n'
        } else if (!hasInlineImage) {
          buffer += line + '\n'
        }
      }
    }

    flushBuffer()
    return { blocks, plainText: text }
  }

  protected chunkText(text: string, maxLen: number): string[] {
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining)
        break
      }
      let splitAt = remaining.lastIndexOf('\n\n', maxLen)
      if (splitAt <= 0) splitAt = remaining.lastIndexOf('\n', maxLen)
      if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', maxLen)
      if (splitAt <= 0) splitAt = maxLen
      chunks.push(remaining.slice(0, splitAt))
      remaining = remaining.slice(splitAt).trimStart()
    }
    return chunks
  }

  // ---------------------------------------------------------------------------
  // File context builder
  // ---------------------------------------------------------------------------

  protected buildFileContext(files: SlackFileAttachment[]): string {
    return files
      .map((f) => {
        const name = f.name ?? f.title ?? 'unnamed'
        const type = f.mimetype ?? f.filetype ?? 'unknown'
        const size = f.size ? `${(f.size / 1024).toFixed(1)}KB` : 'unknown size'
        return `[File shared: ${name} (${type}, ${size})]`
      })
      .join('\n')
  }

  protected static readonly SLACK_MEDIA_MAX_BYTES = 20 * 1024 * 1024

  protected resolveSlackFileType(mimetype: string | undefined): 'image' | 'video' | 'text' {
    if (!mimetype) return 'text'
    if (mimetype.startsWith('image/')) return 'image'
    if (mimetype.startsWith('video/')) return 'video'
    return 'text'
  }

  protected async resolveInboundSlackFiles(
    botToken: string,
    userId: string,
    orgId: string | null | undefined,
    files: SlackFileAttachment[] | undefined,
  ): Promise<
    Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>
  > {
    if (!files || files.length === 0) return []

    const results: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }> = []

    for (const file of files) {
      const downloadUrl = file.url_private_download ?? file.url_private
      if (!downloadUrl) continue

      if (file.size && file.size > SlackMediaBase.SLACK_MEDIA_MAX_BYTES) {
        this.logger.warn(
          `Slack file too large: ${file.size} bytes (limit ${SlackMediaBase.SLACK_MEDIA_MAX_BYTES})`,
        )
        continue
      }

      try {
        const { buffer, contentType: downloadContentType } = await this.slackApi.downloadFile(
          botToken,
          downloadUrl,
        )
        const filename = file.name ?? file.title ?? 'file'
        const effectiveMimeType =
          file.mimetype && file.mimetype !== 'application/octet-stream'
            ? file.mimetype
            : downloadContentType !== 'application/octet-stream'
              ? downloadContentType
              : this.inferMimeFromFilename(filename)
        const permanentUrl = await this.uploadSlackMediaToStorage(
          buffer,
          effectiveMimeType,
          userId,
          filename,
        )
        const fileType = this.resolveSlackFileType(effectiveMimeType)

        let extractedText: string | undefined
        if (fileType === 'text') {
          extractedText = await this.tryExtractText(
            buffer,
            effectiveMimeType,
            filename,
            userId,
            orgId,
          )
        }

        results.push({
          filename,
          type: fileType,
          fileUrl: permanentUrl,
          mimeType: effectiveMimeType,
          text: extractedText,
        })
      } catch (err) {
        this.logger.error(`Failed to download Slack file ${file.id}: ${(err as Error).message}`)
      }
    }

    return results
  }

  protected static readonly PLAIN_TEXT_EXTENSIONS = new Set([
    'txt',
    'md',
    'markdown',
    'csv',
    'json',
    'xml',
    'yaml',
    'yml',
    'html',
    'htm',
    'css',
    'js',
    'ts',
    'py',
    'sh',
    'log',
    'env',
    'ini',
    'toml',
  ])

  protected async tryExtractText(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | undefined> {
    try {
      const ext = filename.toLowerCase().split('.').pop() ?? ''
      if (mimeType.startsWith('text/') || SlackMediaBase.PLAIN_TEXT_EXTENSIONS.has(ext)) {
        return buffer.toString('utf-8').trim() || undefined
      }
      const text = await this.documentExtraction.extractText(buffer, mimeType, filename, {
        userId,
        orgId: orgId ?? undefined,
        feature: 'slack',
        action: 'document_ocr',
      })
      return text?.trim() || undefined
    } catch (err) {
      this.logger.warn(`Text extraction failed for ${filename}: ${(err as Error).message}`)
      return undefined
    }
  }

  protected static readonly EXTENSION_MIME_MAP: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
  }

  protected inferMimeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && ext in SlackMediaBase.EXTENSION_MIME_MAP) {
      return SlackMediaBase.EXTENSION_MIME_MAP[ext]
    }
    return 'application/octet-stream'
  }

  protected async uploadSlackMediaToStorage(
    buffer: Buffer,
    contentType: string,
    userId: string,
    filename: string,
  ): Promise<string> {
    const supabase = this.getServiceRoleClient()
    const storagePath = `${userId}/slack/${randomUUID()}-${filename}`
    return this.slackRuntimeRepo.uploadCampaignStorageObjectAndGetPublicUrl(
      supabase,
      storagePath,
      buffer,
      contentType,
    )
  }


}
