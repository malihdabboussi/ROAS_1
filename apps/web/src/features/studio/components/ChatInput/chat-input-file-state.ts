import type { DocumentAttachment } from '../../types'
import type { AttachedFile } from '../chat/FileAttachments'

type IdFactory = () => string
type ObjectUrlFactory = (file: File) => string
type ObjectUrlRevoker = (url: string) => void

export function seedAttachedFilesFromDocuments(
  documents: DocumentAttachment[] | undefined,
  createId: IdFactory = () => crypto.randomUUID(),
): AttachedFile[] {
  if (!documents || documents.length === 0) return []

  return documents.map((doc) => ({
    id: createId(),
    file: new globalThis.File([], doc.filename, { type: doc.mimeType ?? '' }),
    uploading: false,
    parsed: [
      {
        filename: doc.filename,
        mimeType: doc.mimeType ?? '',
        sizeBytes: 0,
        type: doc.type,
        text: doc.text,
        dataUrl: doc.dataUrl,
        fileUrl: doc.fileUrl,
        mediaAssetId: doc.mediaAssetId,
      },
    ],
  }))
}

export function createPendingAttachedFiles(
  files: readonly File[],
  createId: IdFactory = () => crypto.randomUUID(),
  createObjectUrl: ObjectUrlFactory = (file) => URL.createObjectURL(file),
): AttachedFile[] {
  return files.map((file) => ({
    id: createId(),
    file,
    uploading: true,
    previewUrl: file.type.startsWith('image/') ? createObjectUrl(file) : undefined,
  }))
}

export function revokeAttachedFilePreviewUrls(
  files: readonly AttachedFile[],
  revokeObjectUrl: ObjectUrlRevoker = (url) => URL.revokeObjectURL(url),
): void {
  files.forEach((file) => {
    if (file.previewUrl?.startsWith('blob:')) {
      revokeObjectUrl(file.previewUrl)
    }
  })
}

export function removeAttachedFileById(
  files: readonly AttachedFile[],
  id: string,
  revokeObjectUrl: ObjectUrlRevoker = (url) => URL.revokeObjectURL(url),
): AttachedFile[] {
  const target = files.find((file) => file.id === id)
  if (target?.previewUrl?.startsWith('blob:')) {
    revokeObjectUrl(target.previewUrl)
  }
  return files.filter((file) => file.id !== id)
}

export function attachedFilesToDocumentAttachments(
  files: readonly AttachedFile[],
): DocumentAttachment[] {
  return files
    .filter((file) => Boolean(file.parsed) && !file.error)
    .flatMap((file) =>
      (file.parsed ?? []).map((parsed) => {
        if (parsed.type === 'video' || parsed.type === 'audio') {
          return {
            filename: parsed.filename,
            type: parsed.type,
            fileUrl: parsed.fileUrl,
            mimeType: parsed.mimeType,
            mediaAssetId: parsed.mediaAssetId,
            sizeBytes: parsed.sizeBytes,
          }
        }
        if (parsed.type === 'image') {
          return {
            filename: parsed.filename,
            type: 'image' as const,
            fileUrl: parsed.fileUrl,
            mimeType: parsed.mimeType,
            mediaAssetId: parsed.mediaAssetId,
            sizeBytes: parsed.sizeBytes,
            ...(parsed.fileUrl ? {} : { dataUrl: parsed.dataUrl }),
          }
        }
        return {
          filename: parsed.filename,
          type: 'text' as const,
          text: parsed.text,
          fileUrl: parsed.fileUrl,
          mimeType: parsed.mimeType,
          mediaAssetId: parsed.mediaAssetId,
          sizeBytes: parsed.sizeBytes,
          preview: parsed.preview,
          documentIntelligence: parsed.documentIntelligence ?? null,
        }
      }),
    )
}
