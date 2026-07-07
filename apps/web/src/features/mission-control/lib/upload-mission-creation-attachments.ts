import {
  CHAT_MAX_FILES,
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  getChatFileSizeError,
} from '@/lib/chat/chat-toast-errors.config'
import {
  concurrentMap,
  presignPutUploadFile,
  type AssetRef,
} from '@/lib/media/presigned-client-upload'

export type MissionCreationAttachment = {
  url: string
  name: string
  size: number
  type: string
  asset_id?: string
  asset_ref?: AssetRef
}

export async function uploadMissionCreationAttachments(
  files: File[],
  campaignId: string,
): Promise<MissionCreationAttachment[]> {
  if (files.length > CHAT_MAX_FILES) {
    throw new Error(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
  }

  for (const file of files) {
    const sizeError = getChatFileSizeError(file)
    if (sizeError) {
      throw new Error(sizeError)
    }
  }

  const results = await concurrentMap(
    files,
    CHAT_UPLOAD_CONCURRENCY,
    async (file): Promise<MissionCreationAttachment> => {
      const confirmed = await presignPutUploadFile({
        file,
        name: file.name,
        campaign_id: campaignId,
        category: 'chat_upload',
      })
      const url = confirmed.url || confirmed.asset?.public_url
      if (!url) throw new Error(CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage)
      return {
        url,
        name: file.name,
        size: file.size,
        type: file.type,
        asset_id: confirmed.asset?.id,
        asset_ref: confirmed.asset_ref,
      }
    },
  )

  const attachments: MissionCreationAttachment[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') attachments.push(result.value)
    else throw new Error(CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage)
  }

  return attachments
}
