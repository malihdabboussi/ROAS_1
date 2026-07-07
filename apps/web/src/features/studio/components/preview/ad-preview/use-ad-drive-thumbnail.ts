'use client'

import { useEffect, useState } from 'react'
import { getDriveFile } from '@/lib/services/google-drive-api'
import type { Ad } from '../../../types'

export function useDriveThumbnail(ad: Ad | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const driveFileId =
    ad?.metadata && typeof ad.metadata.drive_file_id === 'string'
      ? (ad.metadata.drive_file_id as string)
      : null
  useEffect(() => {
    if (!driveFileId) {
      setUrl(null)
      return
    }
    let cancelled = false
    getDriveFile(driveFileId)
      .then((res) => {
        if (!cancelled && res?.file?.thumbnailLink) setUrl(res.file.thumbnailLink)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [driveFileId])
  return url
}
