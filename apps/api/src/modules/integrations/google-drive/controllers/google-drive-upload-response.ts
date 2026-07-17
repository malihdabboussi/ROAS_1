import { buildExternalAssetRef } from '@vibey/api-shared'
import type { GoogleDriveFile } from '../types/google-drive.types'

type DriveUploadBody = {
  name: string
  mimeType: string
  folderId?: string
}

export function buildGoogleDriveUploadResponse(
  file: GoogleDriveFile,
  body: DriveUploadBody,
  bufferLength: number,
  orgId: string | null,
) {
  const size = Number(file.size)
  const parent = Array.isArray(file.parents) ? file.parents[0] : body.folderId
  return {
    success: true,
    file,
    asset_ref: buildExternalAssetRef({
      provider: 'google_drive',
      external_id: file.id,
      file_path: parent ? `${parent}/${file.name}` : file.name,
      url: file.webViewLink,
      mime_type: file.mimeType ?? body.mimeType,
      name: file.name,
      original_filename: body.name,
      file_size: Number.isFinite(size) ? size : bufferLength,
      org_id: orgId,
      source: 'google_drive',
      source_surface: 'google_drive',
      metadata: { folder_id: body.folderId ?? null },
    }),
  }
}
