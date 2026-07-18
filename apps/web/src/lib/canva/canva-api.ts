'use client'

import { backendUpload } from '@/lib/api/backend-client'
import { connectComposioIntegration } from '@/lib/integrations/connect-composio-integration'

export type CanvaHandoffResponse =
  | { success: true; edit_url: string; design_id?: string }
  | { success: false; error?: string; code?: 'NOT_CONNECTED' | 'HANDOFF_FAILED' }

export type CanvaOpenResult = { status: 'opened'; editUrl: string } | { status: 'oauth_opened' }

export async function importCanvaDesignFile(options: {
  blob: Blob
  filename: string
  title: string
}): Promise<CanvaHandoffResponse> {
  const form = new FormData()
  const mimeType = options.blob.type || canvaDesignMimeType(options.filename)
  const uploadBlob = mimeType ? new Blob([options.blob], { type: mimeType }) : options.blob
  form.append('file', uploadBlob, options.filename)
  form.append('title', options.title)
  return backendUpload<CanvaHandoffResponse>('/api/media/canva/import', form)
}

function canvaDesignMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'pptx') {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  if (extension === 'docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (extension === 'pdf') return 'application/pdf'
  return ''
}

export async function openCanvaDesignFile(options: {
  createFile: () => Promise<{ blob: Blob; filename: string }>
  title: string
}): Promise<CanvaOpenResult> {
  const pendingTab = window.open('about:blank', '_blank')
  if (pendingTab) pendingTab.opener = null

  try {
    const file = await options.createFile()
    let response = await importCanvaDesignFile({ ...file, title: options.title })
    if (!response.success && response.code === 'NOT_CONNECTED') {
      const connection = await connectComposioIntegration('canva')
      if (connection.status === 'oauth_opened') {
        pendingTab?.close()
        return { status: 'oauth_opened' }
      }
      response = await importCanvaDesignFile({ ...file, title: options.title })
    }
    if (!response.success) throw new Error(response.error || 'Canva import failed')

    if (pendingTab) pendingTab.location.replace(response.edit_url)
    else if (!window.open(response.edit_url, '_blank', 'noopener,noreferrer')) {
      window.location.assign(response.edit_url)
    }
    return { status: 'opened', editUrl: response.edit_url }
  } catch (error) {
    pendingTab?.close()
    throw error
  }
}
