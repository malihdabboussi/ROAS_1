import { Injectable, Logger } from '@nestjs/common'
import { type DocumentIntelligenceMetadata } from '@vibey/api-shared'
import { DocumentParserService } from '../../chat/services/document-parser.service'
import type {
  OpenClawInputContentPart,
  OpenClawInputMessage,
} from '../../chat/services/openclaw-proxy.service'
import { buildUploadedDocumentContext } from '../../chat/utils/uploaded-document-context'
import type { ChannelMessageRow } from '../repositories/channel-agent.repository'

interface ChannelDocumentAttachment {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

@Injectable()
export class ChannelAgentInputService {
  buildDeltaInput(
    allThreadMessages: ChannelMessageRow[],
    trigger: ChannelMessageRow,
    agentKey: string,
    senderNames: Map<string, string>,
  ): OpenClawInputMessage[] {
    const lastOwnReplyIdx = allThreadMessages.reduce((acc, m, idx) => {
      if (m.sender_type === 'agent' && m.sender_id === agentKey && m.id !== trigger.id) return idx
      return acc
    }, -1)

    const delta =
      lastOwnReplyIdx === -1
        ? allThreadMessages.filter((m) => m.id !== trigger.id)
        : allThreadMessages.slice(lastOwnReplyIdx + 1).filter((m) => m.id !== trigger.id)

    const historyLines: string[] = []

    for (const msg of delta) {
      const text = msg.content?.replace(/<[^>]+>/g, '').trim() ?? ''
      const attachmentNote = this.formatAttachmentNote(msg.metadata)
      if (!text && !attachmentNote) continue
      const name = senderNames.get(msg.sender_id) ?? msg.sender_id
      historyLines.push(`[${name}]: ${text}${attachmentNote}`)
    }

    const triggerText = trigger.content?.replace(/<[^>]+>/g, '').trim() ?? ''
    const userName = senderNames.get(trigger.sender_id) ?? 'User'

    const input: OpenClawInputMessage[] = []

    if (historyLines.length > 0) {
      const historyBlock =
        '[CONVERSATION_HISTORY]\n' +
        'The following is a transcript of recent messages in this channel thread. ' +
        'Use this to maintain context of the multi-agent conversation.\n\n' +
        historyLines.join('\n\n')
      input.push({ type: 'message', role: 'user', content: historyBlock })
      input.push({ type: 'message', role: 'assistant', content: 'Conversation history received.' })
    }

    input.push({ type: 'message', role: 'user', content: `[${userName}]: ${triggerText}` })

    return input
  }

  buildChannelContextInput(
    contextMessages: ChannelMessageRow[],
    senderNames: Map<string, string>,
  ): OpenClawInputMessage[] {
    const contextLines = contextMessages
      .map((m) => {
        const name = senderNames.get(m.sender_id) ?? m.sender_id
        const text = m.content?.replace(/<[^>]+>/g, '').trim() ?? ''
        const attachmentNote = this.formatAttachmentNote(m.metadata)
        if (!text && !attachmentNote) return null
        return `${name}: ${text}${attachmentNote}`
      })
      .filter((line): line is string => !!line)

    if (contextLines.length === 0) return []

    return [
      {
        type: 'message',
        role: 'user',
        content: `[Recent channel context]\n${contextLines.join('\n')}`,
      },
      { type: 'message', role: 'assistant', content: 'Context received.' },
    ]
  }

  getAttachmentUrls(metadata: Record<string, unknown> | null | undefined): string[] {
    const raw = metadata?.attachments
    if (!Array.isArray(raw)) return []
    return raw.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  }

  async resolveChannelAttachments(input: {
    urls: string[]
    userId: string
    orgId: string | null
    channelId: string
    campaignId: string | null
    documentParser: DocumentParserService
    logger: Logger
  }): Promise<ChannelDocumentAttachment[]> {
    const documents = input.urls.map((url) => this.urlToDocumentAttachment(url))

    for (const doc of documents) {
      if (doc.type !== 'text' || doc.text?.trim() || !doc.fileUrl) continue
      try {
        const res = await fetch(doc.fileUrl)
        if (!res.ok) continue
        const buffer = Buffer.from(await res.arrayBuffer())
        const [parsed] = await input.documentParser.parse(
          buffer,
          doc.filename,
          doc.mimeType ?? 'application/octet-stream',
          {
            userId: input.userId,
            orgId: input.orgId ?? undefined,
            conversationId: input.channelId,
            campaignId: input.campaignId ?? undefined,
            feature: 'channel',
            action: 'document_ocr',
          },
        )
        if (parsed?.text?.trim()) doc.text = parsed.text
        if (parsed?.preview && !doc.preview) doc.preview = parsed.preview
        if (parsed?.sizeBytes && !doc.sizeBytes) doc.sizeBytes = parsed.sizeBytes
        if (parsed?.mediaAssetId && !doc.mediaAssetId) doc.mediaAssetId = parsed.mediaAssetId
        if (parsed?.pageCount && !doc.pageCount) doc.pageCount = parsed.pageCount
      } catch (err) {
        input.logger.warn(`Failed to extract text from channel attachment ${doc.filename}: ${err}`)
      }
    }

    return documents
  }

  applyAttachmentsToInput(
    input: OpenClawInputMessage[],
    documents: ChannelDocumentAttachment[],
  ): void {
    if (documents.length === 0) return

    let lastUserIdx = -1
    for (let i = input.length - 1; i >= 0; i--) {
      if (input[i]?.role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return

    const msg = input[lastUserIdx]!
    const baseText =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter(
              (part): part is { type: 'input_text'; text: string } =>
                part.type === 'input_text' && typeof part.text === 'string',
            )
            .map((part) => part.text)
            .join('')

    const textDocuments = documents.filter((doc) => doc.type === 'text')
    const videoDocuments = documents.filter((doc) => doc.type === 'video' && !!doc.fileUrl)
    const audioDocuments = documents.filter((doc) => doc.type === 'audio' && !!doc.fileUrl)
    const imageDocuments = documents.filter((doc) => doc.type === 'image' && !!doc.fileUrl)
    const attachmentContext = [
      this.buildDocumentContext(textDocuments),
      this.buildImageContext(imageDocuments),
      this.buildVideoContext(videoDocuments),
      this.buildAudioContext(audioDocuments),
    ]
      .filter(Boolean)
      .join('')
    const enrichedText = baseText + attachmentContext

    const imageParts: OpenClawInputContentPart[] = imageDocuments.map((doc) => ({
      type: 'input_image',
      source: { type: 'url', url: doc.fileUrl! },
    }))

    if (imageParts.length > 0) {
      input[lastUserIdx] = {
        ...msg,
        content: [{ type: 'input_text', text: enrichedText }, ...imageParts],
      }
      return
    }

    if (attachmentContext) {
      input[lastUserIdx] = { ...msg, content: enrichedText }
    }
  }

  private formatAttachmentNote(metadata: Record<string, unknown> | null | undefined): string {
    const urls = this.getAttachmentUrls(metadata)
    if (urls.length === 0) return ''
    const labels = urls.map((url) => {
      const pathPart = url.split('?')[0]?.split('/').pop() ?? 'file'
      return decodeURIComponent(pathPart)
    })
    return `\n[Attachments: ${labels.join(', ')}]`
  }

  private urlToDocumentAttachment(url: string): ChannelDocumentAttachment {
    const pathPart = url.split('?')[0]?.split('/').pop() ?? 'file'
    const filename = decodeURIComponent(pathPart)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])
    const videoExts = new Set(['mp4', 'webm', 'mov', 'm4v', 'mkv'])
    const audioExts = new Set(['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav'])
    let type: ChannelDocumentAttachment['type'] = 'text'
    if (imageExts.has(ext)) type = 'image'
    else if (videoExts.has(ext)) type = 'video'
    else if (audioExts.has(ext)) type = 'audio'
    const mimeByExt: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
      csv: 'text/csv',
      json: 'application/json',
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      opus: 'audio/ogg',
      wav: 'audio/wav',
    }
    return {
      filename,
      type,
      fileUrl: url,
      mimeType: mimeByExt[ext] ?? 'application/octet-stream',
    }
  }

  private buildDocumentContext(documents: ChannelDocumentAttachment[]): string {
    return buildUploadedDocumentContext(documents)
  }

  private buildImageContext(documents: ChannelDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**CURRENT MESSAGE IMAGE FILES (already attached as native image inputs; inspect them directly. Use analyze_image only later with image_url if you need to re-read stored images.)**\n',
    ]
    for (const doc of documents) {
      parts.push(
        `\n- **${doc.filename}**: ${doc.fileUrl}\n  - status: attached to this model turn as an image input\n`,
      )
    }
    return parts.join('')
  }

  private buildVideoContext(documents: ChannelDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**USER-UPLOADED VIDEO FILES (use the analyze_video action to extract frames, transcribe, or both)**\n',
    ]
    for (const doc of documents) {
      parts.push(`\n- **${doc.filename}**: ${doc.fileUrl}\n`)
    }
    return parts.join('')
  }

  private buildAudioContext(documents: ChannelDocumentAttachment[]): string {
    if (documents.length === 0) return ''
    const parts: string[] = [
      '\n\n---\n**USER-UPLOADED AUDIO FILES (use transcribe_audio with media_url to transcribe voice notes or audio files; keep the original audio URL. When the spoken language is explicit or reliably known, include language with the provider language code so transcription does not depend on auto-detection.)**\n',
    ]
    for (const doc of documents) {
      parts.push(
        `\n- **${doc.filename}**: ${doc.fileUrl}\n` +
          `  - Suggested call: transcribe_audio(media_url="${doc.fileUrl}")\n` +
          `  - If the spoken language is known, call: transcribe_audio(media_url="${doc.fileUrl}", language="<provider-language-code>")\n`,
      )
    }
    return parts.join('')
  }
}
