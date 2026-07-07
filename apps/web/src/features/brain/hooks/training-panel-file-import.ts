import { toast } from 'sonner'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import { extractDocumentTextWithAsset, type SkDomain } from '../services/sk.service'
import { enqueueSkIngest } from '../services/user-brain-import.service'
import {
  detectBrainUploadKind,
  getBrainUploadLabel,
  getBrainUploadMediaType,
  isExtractableBrainUploadKind,
  isSupportedNativeAudioFormat,
  isSupportedNativeVideoFormat,
  validateNativeMediaDuration,
} from '../utils/upload-validation'

interface EnqueueTrainingPanelFileImportOptions {
  file: File
  brainId: string | null
  domain: SkDomain
}

export async function enqueueTrainingPanelFileImport({
  file,
  brainId,
  domain,
}: EnqueueTrainingPanelFileImportOptions): Promise<void> {
  if (!brainId) {
    toast.error(BRAIN_TOAST_ERRORS.NO_BRAIN_SELECTED.userMessage)
    return
  }

  const detectedKind = detectBrainUploadKind(file)
  const isAudio = detectedKind === 'audio'
  const isVideo = detectedKind === 'video'
  const shouldExtractText = isExtractableBrainUploadKind(detectedKind)

  if (detectedKind === 'unsupported') {
    toast.error(BRAIN_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
    return
  }
  if (isAudio && !isSupportedNativeAudioFormat(file)) {
    toast.error(BRAIN_TOAST_ERRORS.AUDIO_FORMAT_UNSUPPORTED.userMessage)
    return
  }
  if (isVideo && !isSupportedNativeVideoFormat(file)) {
    toast.error(BRAIN_TOAST_ERRORS.VIDEO_FORMAT_UNSUPPORTED.userMessage)
    return
  }
  if (isAudio || isVideo) {
    const durationValidation = await validateNativeMediaDuration(file, isAudio ? 'audio' : 'video')
    if (!durationValidation.ok) {
      toast.error(BRAIN_TOAST_ERRORS[durationValidation.error].userMessage)
      return
    }
  }

  let text: string
  let extractedAsset: Awaited<ReturnType<typeof extractDocumentTextWithAsset>> | null = null
  if (shouldExtractText) {
    try {
      extractedAsset = await extractDocumentTextWithAsset(file)
      text = extractedAsset.text
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.EXTRACT_TEXT_FAILED.userMessage,
      )
      return
    }
  } else if (isAudio || isVideo) {
    text = file.name
  } else {
    text = await file.text()
  }
  if (!text.trim()) {
    toast.error(
      shouldExtractText
        ? BRAIN_TOAST_ERRORS.DOCUMENT_EMPTY.userMessage
        : BRAIN_TOAST_ERRORS.FILE_EMPTY.userMessage,
    )
    return
  }

  const fileName = file.name.replace(/\.[^.]+$/, '')
  const mediaLabel = getBrainUploadLabel(detectedKind)
  try {
    await enqueueSkIngest({
      brainId,
      text: text.trim(),
      sourceType: 'notes',
      title: `${mediaLabel}: ${fileName}`,
      domain,
      mediaType: getBrainUploadMediaType(detectedKind),
      mediaUrl: extractedAsset?.fileUrl,
      mediaMimeType: file.type || 'application/octet-stream',
      assetId: extractedAsset?.assetId ?? null,
      assetRef: extractedAsset?.assetRef ?? null,
    })
    toast.success(`"${fileName}" added to processing queue`)
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.INGESTION_FAILED.userMessage,
    )
  }
}
