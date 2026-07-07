import { useEffect, useState } from 'react'
import { getDriveFile } from '@/lib/services/google-drive-api'
import type { Ad } from '../../types'

interface UseAdSettingsDrivePreviewParams {
  ad: Ad | null
  perPlacement: boolean
}

export function useAdSettingsDrivePreview({
  ad,
  perPlacement,
}: UseAdSettingsDrivePreviewParams): {
  driveFileId: string | null
  drivePreviewUrl: string | null
} {
  const [drivePreviewUrl, setDrivePreviewUrl] = useState<string | null>(null)
  const driveFileId =
    !perPlacement && ad?.metadata && typeof ad.metadata.drive_file_id === 'string'
      ? (ad.metadata.drive_file_id as string)
      : null

  useEffect(() => {
    if (!driveFileId) {
      setDrivePreviewUrl(null)
      return
    }
    let cancelled = false
    getDriveFile(driveFileId)
      .then((res) => {
        if (!cancelled && res?.file?.thumbnailLink) setDrivePreviewUrl(res.file.thumbnailLink)
      })
      .catch(() => {
        if (!cancelled) setDrivePreviewUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [driveFileId])

  return { driveFileId, drivePreviewUrl }
}
