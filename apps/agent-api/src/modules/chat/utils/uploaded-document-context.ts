import type { DocumentIntelligenceMetadata } from '@vibey/api-shared'

export interface UploadedDocumentContextInput {
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

function hasUsableText(doc: UploadedDocumentContextInput): boolean {
  const text = doc.text?.trim() ?? ''
  if (!text) return false
  const intelligence = doc.documentIntelligence
  if (!intelligence || Object.keys(intelligence).length === 0) return true
  return intelligence.status === 'ready' && intelligence.text_quality === 'usable'
}

function shouldUseNativeFile(doc: UploadedDocumentContextInput): boolean {
  const intelligence = doc.documentIntelligence
  if (!intelligence) return false
  return intelligence.status === 'ready' && intelligence.strategy === 'native_file' && !!doc.fileUrl
}

export function buildUploadedDocumentContext(
  documents: UploadedDocumentContextInput[],
): string {
  const textDocuments = documents.filter((doc) => doc.type === 'text')
  if (textDocuments.length === 0) return ''

  const parts: string[] = ['\n\n---\n**USER-UPLOADED DOCUMENTS**\n']

  for (const doc of textDocuments) {
    if (hasUsableText(doc)) {
      parts.push(`\n### ${doc.filename}\n\`\`\`\n${doc.text!.trim()}\n\`\`\`\n`)
      continue
    }

    if (shouldUseNativeFile(doc)) {
      parts.push(
        `\n### ${doc.filename}\n` +
          `The original file is attached to this request for native model reading.\n` +
          `- mime: ${doc.mimeType ?? 'unknown'}\n` +
          `${doc.pageCount ? `- pages: ${doc.pageCount}\n` : ''}`,
      )
      continue
    }

    const reason = doc.documentIntelligence?.reason ?? 'text_unavailable'
    parts.push(
      `\n### ${doc.filename}\n` +
        `No reliable extracted text is available for this file.\n` +
        `- reason: ${reason}\n` +
        `If the answer depends on this file, report that limitation clearly.\n`,
    )
  }

  return parts.join('')
}
