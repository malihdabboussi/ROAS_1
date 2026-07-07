'use client'

import { useCallback, useState } from 'react'
import { presignPutUploadFile, type ConfirmResponse } from '@/lib/media/presigned-client-upload'

type UploadStatus = 'idle' | 'presigning' | 'uploading' | 'confirming' | 'ready' | 'error'

interface UploadOptions {
  file: File
  category?: string
  name?: string
  campaign_id?: string
  space_id?: string
  aiAnalysis?: boolean
}

export type { ConfirmResponse }

export function usePresignedUpload() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')

  const upload = useCallback(async (options: UploadOptions): Promise<ConfirmResponse> => {
    setStatus('presigning')
    setProgress(0)

    const confirmed = await presignPutUploadFile({
      ...options,
      onUploadProgress: (pct) => {
        setStatus('uploading')
        setProgress(pct)
      },
    })

    setStatus('ready')
    setProgress(100)
    return confirmed
  }, [])

  const reset = useCallback(() => {
    setProgress(0)
    setStatus('idle')
  }, [])

  return { upload, status, progress, reset }
}
