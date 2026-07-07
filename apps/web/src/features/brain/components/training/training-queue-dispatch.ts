import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import { extractDocumentTextWithAsset } from '../../services/sk.service'
import {
  enqueueSkIngest,
  enqueueSkLinkIngest,
  importFathomMeeting,
  importFirefliesTranscript,
} from '../../services/user-brain-import.service'
import {
  detectBrainUploadKind,
  getBrainUploadMediaType,
  isExtractableBrainUploadKind,
  validateNativeMediaDuration,
} from '../../utils/upload-validation'
import type { BrainQueueDispatchResult, StagedItem } from './types'

export async function dispatchTrainingItemToBrain({
  item,
  targetBrainId,
  targetIsAgentBrain,
}: {
  item: StagedItem
  targetBrainId: string
  targetIsAgentBrain: boolean
}): Promise<BrainQueueDispatchResult> {
  const title = item.metadata.titleOverride?.trim() || item.preview.title
  const { sourceType, domain } = item.metadata
  try {
    switch (item.payload.kind) {
      case 'text': {
        const res = await enqueueSkIngest({
          brainId: targetBrainId,
          text: item.payload.body.trim(),
          sourceType,
          title,
          domain,
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
      case 'link': {
        const res = await enqueueSkLinkIngest({
          brainId: targetBrainId,
          url: item.payload.url.trim(),
          sourceType,
          title,
          domain,
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
      case 'file': {
        const { file, mediaKind } = item.payload
        let text: string
        let extractedAsset: Awaited<ReturnType<typeof extractDocumentTextWithAsset>> | null = null
        if (isExtractableBrainUploadKind(mediaKind)) {
          extractedAsset = await extractDocumentTextWithAsset(file)
          text = extractedAsset.text
        } else if (mediaKind === 'audio' || mediaKind === 'video') {
          text = file.name
          const dur = await validateNativeMediaDuration(
            file,
            mediaKind === 'audio' ? 'audio' : 'video',
          )
          if (!dur.ok) {
            return { id: item.id, ok: false, error: BRAIN_TOAST_ERRORS[dur.error].userMessage }
          }
        } else {
          text = await file.text()
        }
        if (!text.trim()) {
          return { id: item.id, ok: false, error: 'File appears empty' }
        }
        const res = await enqueueSkIngest({
          brainId: targetBrainId,
          text: text.trim(),
          sourceType,
          title,
          domain,
          mediaType: getBrainUploadMediaType(mediaKind),
          mediaUrl: extractedAsset?.fileUrl,
          mediaMimeType: file.type || 'application/octet-stream',
          assetId: extractedAsset?.assetId ?? null,
          assetRef: extractedAsset?.assetRef ?? null,
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
      case 'media-asset': {
        const { asset } = item.payload
        if (!asset.public_url) return { id: item.id, ok: false, error: 'Asset missing URL' }
        const blob = await fetch(asset.public_url).then((r) => r.blob())
        const file = new File([blob], asset.original_filename || asset.name, {
          type: asset.mime_type || blob.type,
        })
        const mediaKind = detectBrainUploadKind(file)
        if (mediaKind === 'unsupported') {
          return {
            id: item.id,
            ok: false,
            error: BRAIN_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage,
          }
        }
        const extractedAsset = isExtractableBrainUploadKind(mediaKind)
          ? await extractDocumentTextWithAsset(file, {
              fileUrl: asset.public_url,
              assetId: asset.id,
            })
          : null
        const text = extractedAsset
          ? extractedAsset.text
          : mediaKind === 'audio' || mediaKind === 'video'
            ? file.name
            : await file.text()
        if (!text.trim()) return { id: item.id, ok: false, error: 'Asset content empty' }
        const res = await enqueueSkIngest({
          brainId: targetBrainId,
          text: text.trim(),
          sourceType,
          title,
          domain,
          mediaType: getBrainUploadMediaType(mediaKind),
          mediaUrl: asset.public_url,
          mediaMimeType: file.type || 'application/octet-stream',
          assetId: extractedAsset?.assetId ?? asset.id,
          assetRef: extractedAsset?.assetRef ?? null,
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
      case 'fathom': {
        const res = await importFathomMeeting(item.payload.meeting, {
          brainId: targetBrainId,
          targetBrain: targetIsAgentBrain ? 'agent' : 'user',
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
      case 'fireflies': {
        const res = await importFirefliesTranscript(item.payload.transcript.id, {
          brainId: targetBrainId,
          targetBrain: targetIsAgentBrain ? 'agent' : 'user',
        })
        return { id: item.id, ok: !!res.success, deduped: res.deduped }
      }
    }
  } catch (err) {
    return {
      id: item.id,
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
